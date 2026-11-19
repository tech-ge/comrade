import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Reference required" }, { status: 400 });

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  if (!reference.startsWith("dep_")) return NextResponse.json({ error: "Unsupported payment reference" }, { status: 400 });
  const { data: transaction, error: transactionError } = await admin
    .from("wallet_transactions")
    .select("id, wallet_id, amount_ksh, status")
    .eq("paystack_ref", reference)
    .eq("type", "deposit")
    .maybeSingle();
  if (transactionError || !transaction) return NextResponse.json({ error: "Deposit not found for this account" }, { status: 404 });
  const { data: wallet } = await admin.from("wallets").select("id").eq("id", transaction.wallet_id).eq("user_id", user.id).maybeSingle();
  if (!wallet) return NextResponse.json({ error: "Deposit not found for this account" }, { status: 404 });

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const verification = await response.json();
  if (!response.ok || !verification.status || verification.data?.status !== "success") {
    const paymentStatus = verification.data?.status || "failed";
    if (["failed", "abandoned"].includes(paymentStatus) && transaction.status === "pending") {
      await admin.from("wallet_transactions").update({ status: "failed" }).eq("id", transaction.id).eq("status", "pending");
    }
    return NextResponse.json({ status: paymentStatus });
  }
  if (verification.data.currency !== "KES") return NextResponse.json({ error: "Payment currency does not match KES" }, { status: 400 });
  const paidAmountKsh = Number(verification.data.amount) / 100;
  if (!Number.isFinite(paidAmountKsh) || paidAmountKsh <= 0 || Math.round(Number(transaction.amount_ksh) * 100) !== Number(verification.data.amount)) {
    return NextResponse.json({ error: "Paid amount does not match the requested deposit" }, { status: 400 });
  }
  if (transaction.status !== "success") {
    const { error } = await admin.rpc("process_wallet_deposit", {
      p_wallet_id: transaction.wallet_id,
      p_amount_ksh: paidAmountKsh,
      p_paystack_ref: reference,
    });
    if (error) return NextResponse.json({ error: "Payment succeeded but wallet credit failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: "success", reference, amount_ksh: paidAmountKsh });
}
