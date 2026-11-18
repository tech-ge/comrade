import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initializePaystack } from "@/lib/paystack/client";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount_ksh } = await req.json();
  const amount = Number(amount_ksh);
  if (!Number.isFinite(amount) || amount < 10) {
    return NextResponse.json({ error: "Minimum deposit is Ksh 10" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (walletError || !wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const reference = `dep_${randomUUID()}`;
  const { error: transactionError } = await admin.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    type: "deposit",
    amount_ksh: amount,
    paystack_ref: reference,
    status: "pending",
  });
  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  const payment = await initializePaystack(amount, reference);
  if (!payment.status) {
    await admin.from("wallet_transactions").update({ status: "failed" }).eq("paystack_ref", reference);
    return NextResponse.json({ error: payment.message || "Paystack initialization failed" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    authorization_url: payment.data.authorization_url,
    reference,
  });
}
