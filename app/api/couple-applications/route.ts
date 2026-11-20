import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, photo_path, message } = await req.json();
  if (!post_id || !message) return NextResponse.json({ error: "Post and message required" }, { status: 400 });
  if (photo_path && (typeof photo_path !== "string" || !photo_path.startsWith(`${user.id}/`))) return NextResponse.json({ error: "Upload your own photo before applying." }, { status: 400 });

  const [{ data: profile }, { data: post }] = await Promise.all([
    sb.from("users").select("gender").eq("id", user.id).single(),
    sb.from("couple_posts").select("id, user_id, poster_gender, looking_for_gender, status").eq("id", post_id).single(),
  ]);
  if (!profile || !post || post.status !== "active") return NextResponse.json({ error: "This search is no longer available to you." }, { status: 404 });
  if (post.user_id === user.id) return NextResponse.json({ error: "You cannot apply to your own search." }, { status: 400 });
  if (profile.gender !== post.looking_for_gender || post.poster_gender === profile.gender) return NextResponse.json({ error: "This search is only open to people of the other gender." }, { status: 403 });
  if (typeof message !== "string" || !message.trim() || message.trim().length > 1000) return NextResponse.json({ error: "Your introduction must be between 1 and 1,000 characters." }, { status: 400 });

  const { error } = await sb.from("couple_applications").insert({
    post_id,
    applicant_id: user.id,
    photo_url: photo_path || "/placeholder-couple.png",
    message: message.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
