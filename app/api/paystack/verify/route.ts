import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return NextResponse.json({ error: "Reference required" }, { status: 400 });

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const verification = await response.json();
  if (!verification.status || verification.data?.status !== "success") {
    return NextResponse.json({ status: verification.data?.status || "failed" });
  }

  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const admin = supabaseAdmin();

  if (reference.startsWith("dep_")) {
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { data: wallet } = await admin.from("wallets").select("id").eq("user_id", user.id).single();
    if (!wallet) return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    await admin.rpc("process_wallet_deposit", {
      p_wallet_id: wallet.id,
      p_amount_ksh: Number(verification.data.amount) / 100,
      p_paystack_ref: reference,
    });
  }

  return NextResponse.json({ ok: true, status: "success", reference });
}
