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
  const admin = supabaseAdmin();

  if (["transfer.success", "transfer.failed", "transfer.reversed"].includes(event.event)) {
    const reference = String(event.data?.reference || "");
    if (!reference) return NextResponse.json({ ok: true });
    const { data: withdrawal, error: withdrawalError } = await admin.from("wallet_transactions")
      .select("amount_ksh")
      .eq("paystack_ref", reference)
      .eq("type", "withdrawal")
      .maybeSingle();
    if (withdrawalError) return NextResponse.json({ error: "Could not find withdrawal" }, { status: 500 });
    if (!withdrawal) return NextResponse.json({ ok: true });
    if (event.data?.currency !== "KES" || Math.round(Number(withdrawal.amount_ksh) * 100) !== Number(event.data.amount)) {
      return NextResponse.json({ error: "Paystack transfer details do not match" }, { status: 400 });
    }
    const transferStatus = event.event === "transfer.success" ? "success" : event.event === "transfer.failed" ? "failed" : "reversed";
    const { error } = await admin.rpc("finish_wallet_withdrawal", {
      p_paystack_ref: reference,
      p_transfer_status: transferStatus,
      p_transfer_code: event.data?.transfer_code || null,
      p_error: event.data?.failures ? String(event.data.failures) : null,
    });
    if (error) return NextResponse.json({ error: "Could not update wallet after transfer" }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (event.event !== "charge.success") return NextResponse.json({ ok: true });

  const reference = String(event.data?.reference || "");
  const amountKsh = Number(event.data?.amount || 0) / 100;
  if (!reference || amountKsh <= 0) return NextResponse.json({ ok: true });

  if (reference.startsWith("dep_")) {
    const { data: transaction, error: transactionError } = await admin
      .from("wallet_transactions")
      .select("wallet_id, amount_ksh")
      .eq("paystack_ref", reference)
      .eq("type", "deposit")
      .maybeSingle();
    if (transactionError) return NextResponse.json({ error: "Could not find deposit" }, { status: 500 });
    if (transaction && event.data?.currency === "KES" && Math.round(Number(transaction.amount_ksh) * 100) === Number(event.data.amount)) {
      const { error } = await admin.rpc("process_wallet_deposit", {
        p_wallet_id: transaction.wallet_id,
        p_amount_ksh: amountKsh,
        p_paystack_ref: reference,
      });
      if (error) return NextResponse.json({ error: "Wallet credit failed" }, { status: 500 });
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
