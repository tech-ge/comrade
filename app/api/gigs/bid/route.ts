import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: member } = await sb.from("users").select("read_only").eq("id", user.id).maybeSingle();
  if (member?.read_only) return NextResponse.json({ error: "Your account is read-only while reports are reviewed." }, { status: 403 });

  const { gig_id } = await req.json();
  const admin = supabaseAdmin();

  const { data: gig, error: gErr } = await admin.from("gigs").select("*").eq("id", gig_id).single();
  if (gErr || !gig) return NextResponse.json({ error: "Gig not found" }, { status: 404 });
  if (gig.status !== "active") return NextResponse.json({ error: "Gig closed" }, { status: 400 });
  if (gig.user_id === user.id) return NextResponse.json({ error: "Cannot bid on your own gig" }, { status: 400 });

  const { error: bErr } = await admin.from("gig_bids").insert({
    gig_id,
    bidder_id: user.id,
    contact_sent_at: new Date().toISOString(),
  });
  if (bErr) return NextResponse.json({ error: bErr.message }, { status: 400 });

  // Send private contact to bidder via system message
  await admin.from("system_messages").insert({
    user_id: user.id,
    type: "gig_contact",
    title: "Gig contact details",
    body: `Contact: ${gig.private_contact}${gig.private_links ? `\nLinks: ${gig.private_links}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}
