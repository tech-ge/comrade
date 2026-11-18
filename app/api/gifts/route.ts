import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { receiver_wallet_id, gift_id, quantity, context_type, context_id } = await req.json();
  if (!receiver_wallet_id || !gift_id || !context_id) {
    return NextResponse.json({ error: "Receiver, gift, and context required" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: senderWallet } = await admin.from("wallets").select("id").eq("user_id", user.id).single();
  if (!senderWallet) return NextResponse.json({ error: "Sender wallet not found" }, { status: 404 });

  const { data, error } = await admin.rpc("process_gift", {
    p_sender_wallet: senderWallet.id,
    p_receiver_wallet: receiver_wallet_id,
    p_gift_id: gift_id,
    p_quantity: Number(quantity) || 1,
    p_context_type: context_type,
    p_context_id: context_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, gift_send_id: data });
}
