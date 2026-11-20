import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: member } = await sb.from("users").select("read_only").eq("id", user.id).maybeSingle();
  if (member?.read_only) return NextResponse.json({ error: "Your account is read-only while reports are reviewed." }, { status: 403 });

  const { post_id, photo_path, message } = await req.json();
  if (!post_id || !message) return NextResponse.json({ error: "Post and message required" }, { status: 400 });
  if (photo_path && (typeof photo_path !== "string" || !photo_path.startsWith(`${user.id}/`))) return NextResponse.json({ error: "Upload your own photo before applying." }, { status: 400 });

  const { data: post } = await sb.from("couple_posts").select("id, user_id, status").eq("id", post_id).single();
  if (!post || post.status !== "active") return NextResponse.json({ error: "This search is no longer available to you." }, { status: 404 });
  if (post.user_id === user.id) return NextResponse.json({ error: "You cannot apply to your own search." }, { status: 400 });
  if (typeof message !== "string" || !message.trim() || message.trim().length > 1000) return NextResponse.json({ error: "Your introduction must be between 1 and 1,000 characters." }, { status: 400 });

  const { error } = await sb.from("couple_applications").insert({
    post_id,
    applicant_id: user.id,
    photo_url: photo_path || "/placeholder-couple.png",
    message: message.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await supabaseAdmin().from("system_messages").insert({ user_id: post.user_id, type: "couple_application", title: "Someone is interested in your post", body: message.trim().slice(0, 180) });
  return NextResponse.json({ ok: true });
}
