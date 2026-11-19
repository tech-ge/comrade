import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("gifts").select("id, name, icon_url, price_ksh").eq("active", true).order("price_ksh");
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ gifts: data || [] });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { gift_id, quantity, context_type, context_id } = await req.json();
  if (!gift_id || !context_id || context_type !== "help") {
    return NextResponse.json({ error: "Choose a gift and an active help request." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const [{ data: senderWallet }, { data: helpPost }] = await Promise.all([
    admin.from("wallets").select("id").eq("user_id", user.id).single(),
    admin.from("help_posts").select("id, user_id").eq("id", context_id).eq("status", "active").single(),
  ]);
  if (!senderWallet) return NextResponse.json({ error: "Sender wallet not found" }, { status: 404 });
  if (!helpPost) return NextResponse.json({ error: "This help request is no longer available." }, { status: 404 });
  if (helpPost.user_id === user.id) return NextResponse.json({ error: "You cannot send a gift to yourself." }, { status: 400 });
  const { data: receiverWallet } = await admin.from("wallets").select("id").eq("user_id", helpPost.user_id).single();
  if (!receiverWallet) return NextResponse.json({ error: "Recipient wallet not found" }, { status: 404 });

  const { data, error } = await admin.rpc("process_gift", {
    p_sender_wallet: senderWallet.id,
    p_receiver_wallet: receiverWallet.id,
    p_gift_id: gift_id,
    p_quantity: Number(quantity) || 1,
    p_context_type: context_type,
    p_context_id: context_id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, gift_send_id: data });
}
