import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = supabaseAdmin();
  const { data: wallet, error } = await admin
    .from("wallets")
    .select("id, balance_ksh, reserved_ksh")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!wallet) return NextResponse.json({ balance_ksh: 0, transactions: [], withdraw_unlocked: false });

  const [{ data: transactions }, { data: recentGift }] = await Promise.all([
    admin
      .from("wallet_transactions")
      .select("id, type, amount_ksh, status, created_at")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("wallet_transactions")
      .select("id")
      .eq("wallet_id", wallet.id)
      .eq("type", "gift_received")
      .eq("status", "success")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .maybeSingle(),
  ]);

  return NextResponse.json({
    balance_ksh: wallet.balance_ksh,
    reserved_ksh: wallet.reserved_ksh || 0,
    available_balance_ksh: Number(wallet.balance_ksh) - Number(wallet.reserved_ksh || 0),
    transactions: transactions || [],
    withdraw_unlocked: Boolean(recentGift),
  });
}
