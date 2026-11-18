import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount_ksh, account_name, account_number, bank_name, mobile_number } = await req.json();
  const amount = Number(amount_ksh);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Minimum withdrawal is Ksh 100" }, { status: 400 });
  }
  if (!account_name || !account_number || !bank_name) {
    return NextResponse.json({ error: "Account name, account number, and bank name are required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .select("id, balance_ksh")
    .eq("user_id", user.id)
    .single();
  if (walletError || !wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }
  if (Number(wallet.balance_ksh) < amount) {
    return NextResponse.json({ error: "Insufficient wallet balance" }, { status: 400 });
  }

  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentGift, error: giftError } = await admin
    .from("wallet_transactions")
    .select("id")
    .eq("wallet_id", wallet.id)
    .eq("type", "gift_received")
    .eq("status", "success")
    .gte("created_at", oneWeekAgo)
    .limit(1)
    .maybeSingle();
  if (giftError) {
    return NextResponse.json({ error: giftError.message }, { status: 400 });
  }
  if (!recentGift) {
    return NextResponse.json({
      error: "Withdrawals require at least one gift received within the past 7 days",
    }, { status: 403 });
  }

  const reference = `wd_${randomUUID()}`;
  const details = {
    account_name: String(account_name).trim(),
    account_number: String(account_number).trim(),
    bank_name: String(bank_name).trim(),
    mobile_number: mobile_number ? String(mobile_number).trim() : null,
  };

  const { error: transactionError } = await admin.from("wallet_transactions").insert({
    wallet_id: wallet.id,
    type: "withdrawal",
    amount_ksh: amount,
    paystack_ref: reference,
    status: "pending",
    withdrawal_details: details,
  });
  if (transactionError) {
    return NextResponse.json({ error: transactionError.message }, { status: 400 });
  }

  await admin
    .from("wallets")
    .update({ balance_ksh: Number(wallet.balance_ksh) - amount })
    .eq("id", wallet.id);

  await admin.from("system_messages").insert({
    user_id: user.id,
    type: "withdrawal",
    title: "Withdrawal requested",
    body: `A withdrawal of Ksh ${amount.toLocaleString()} is pending admin review.`,
  });

  return NextResponse.json({
    ok: true,
    status: "pending",
    reference,
  });
}
