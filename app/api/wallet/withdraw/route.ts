import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { amount_ksh, payout_method, account_name, account_number, bank_name, bank_code, mobile_number } = await req.json();
  const amount = Number(amount_ksh);
  if (!Number.isFinite(amount) || amount < 100 || Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-8) {
    return NextResponse.json({ error: "Minimum withdrawal is Ksh 100. Use no more than 2 decimal places." }, { status: 400 });
  }
  if (typeof account_name !== "string" || !account_name.trim()) {
    return NextResponse.json({ error: "Account holder name is required" }, { status: 400 });
  }
  let normalizedMobile: string | null = null;
  if (payout_method === "mpesa") {
    const phoneDigits = typeof mobile_number === "string" ? mobile_number.replace(/\D/g, "") : "";
    const localPhone = phoneDigits.startsWith("254") ? `0${phoneDigits.slice(3)}` : phoneDigits;
    if (!/^0[17]\d{8}$/.test(localPhone)) {
      return NextResponse.json({ error: "Enter a valid M-Pesa phone number" }, { status: 400 });
    }
    normalizedMobile = localPhone;
  } else if (payout_method === "bank") {
    if (typeof account_number !== "string" || !account_number.trim() || typeof bank_code !== "string" || !bank_code.trim()) {
      return NextResponse.json({ error: "Select a bank and enter the account number" }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: "Choose M-Pesa or bank transfer" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: wallet, error: walletError } = await admin
    .from("wallets")
    .select("id, balance_ksh, reserved_ksh")
    .eq("user_id", user.id)
    .single();
  if (walletError || !wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }
  const { data: openRequests, error: requestError } = await admin
    .from("wallet_transactions")
    .select("amount_ksh")
    .eq("wallet_id", wallet.id)
    .eq("type", "withdrawal")
    .eq("status", "pending");
  if (requestError) return NextResponse.json({ error: requestError.message }, { status: 400 });
  const pendingTotal = (openRequests || []).reduce((sum, item) => sum + Number(item.amount_ksh), 0);
  if (Number(wallet.balance_ksh) - Number(wallet.reserved_ksh || 0) - pendingTotal < amount) {
    return NextResponse.json({ error: "Insufficient available balance after pending withdrawals" }, { status: 400 });
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
    payout_method: payout_method === "mpesa" ? "mpesa" : "bank",
    account_name: String(account_name).trim(),
    account_number: payout_method === "bank" ? String(account_number).trim() : null,
    bank_name: payout_method === "mpesa" ? "M-PESA" : String(bank_name || "").trim(),
    bank_code: payout_method === "bank" ? String(bank_code).trim() : "MPESA",
    mobile_number: normalizedMobile,
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
    message: "Your request is waiting for admin approval. The wallet is charged only after Paystack confirms the transfer.",
  });
}
