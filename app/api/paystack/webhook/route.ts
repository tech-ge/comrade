import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-paystack-signature");
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!signature || !secret) return new NextResponse("Forbidden", { status: 403 });

  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);
  if (
    expectedBuffer.length !== signatureBuffer.length ||
    !timingSafeEqual(expectedBuffer, signatureBuffer)
  ) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const event = JSON.parse(rawBody);
  if (event.event !== "charge.success") return NextResponse.json({ ok: true });

  const reference = String(event.data?.reference || "");
  const amountKsh = Number(event.data?.amount || 0) / 100;
  if (!reference || amountKsh <= 0) return NextResponse.json({ ok: true });

  const admin = supabaseAdmin();
  if (reference.startsWith("dep_")) {
    const { data: transaction } = await admin
      .from("wallet_transactions")
      .select("wallet_id")
      .eq("paystack_ref", reference)
      .maybeSingle();
    if (transaction) {
      await admin.rpc("process_wallet_deposit", {
        p_wallet_id: transaction.wallet_id,
        p_amount_ksh: amountKsh,
        p_paystack_ref: reference,
      });
    }
  }

  if (reference.startsWith("don_")) {
    const { data: donation } = await admin
      .from("cause_donations")
      .select("id, cause_id")
      .eq("paystack_ref", reference)
      .maybeSingle();
    if (donation?.cause_id) {
      const { data: cause } = await admin
        .from("causes")
        .select("raised_ksh")
        .eq("id", donation.cause_id)
        .single();
      if (cause) {
        await admin
          .from("causes")
          .update({ raised_ksh: Number(cause.raised_ksh) + amountKsh })
          .eq("id", donation.cause_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
