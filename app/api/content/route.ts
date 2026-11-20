import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const requiredText = (value: unknown) => typeof value === "string" && value.trim().length > 0;
  const { data: profile } = await sb
    .from("users")
    .select("university_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });
  if (body.image_url && (typeof body.image_url !== "string" || !body.image_url.startsWith(`${user.id}/`))) {
    return NextResponse.json({ error: "Upload an image using the photo picker." }, { status: 400 });
  }

  if (body.type === "story") {
    if (!requiredText(body.body)) return NextResponse.json({ error: "Write something before posting." }, { status: 400 });
    const { error } = await sb.from("stories").insert({
      user_id: user.id,
      university_id: profile.university_id,
      body: body.body,
      image_url: body.image_url || null,
      is_event: Boolean(body.is_event),
      target_scope: body.target_scope || "school",
      target_county_id: body.target_county_id || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "help") {
    if (!requiredText(body.description) || !["comments", "money", "food", "notes", "hostel", "mental_health", "other"].includes(body.help_type)) {
      return NextResponse.json({ error: "Choose a help category and describe the help you need." }, { status: 400 });
    }
    const { error } = await sb.from("help_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      help_type: body.help_type,
      description: body.description,
      proof_url: body.image_url || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "advice") {
    if (!requiredText(body.what_happened) || !requiredText(body.advice_needed)) return NextResponse.json({ error: "Tell us what happened and what advice you need." }, { status: 400 });
    const { error } = await sb.from("advice_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      what_happened: body.what_happened,
      advice_needed: body.advice_needed,
      image_url: body.image_url || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "anonymous") {
    if (!requiredText(body.body)) return NextResponse.json({ error: "Write something before posting." }, { status: 400 });
    const { error } = await sb.from("anonymous_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      body: body.body,
      target_scope: body.target_scope || "school",
      target_county_id: body.target_county_id || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "anonymous_reply") {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    const postId = typeof body.post_id === "string" ? body.post_id : "";
    if (!postId || !text || text.length > 1000) return NextResponse.json({ error: "Write a reply of 1–1,000 characters." }, { status: 400 });
    const { data: post } = await sb.from("anonymous_posts").select("id,user_id").eq("id", postId).maybeSingle();
    if (!post) return NextResponse.json({ error: "Anonymous post not found." }, { status: 404 });
    const { data: reply, error } = await sb.from("anonymous_replies").insert({ post_id: postId, replier_id: user.id, body: text }).select("id,body,created_at").single();
    if (error) return NextResponse.json({ error: "Could not send anonymous reply." }, { status: 400 });
    const { data: replyAuthor } = await supabaseAdmin().from("users").select("profile_photo_url").eq("id", user.id).maybeSingle();
    const replyPhoto = await resolvePhotoUrl(replyAuthor?.profile_photo_url);
    if (post.user_id !== user.id) await supabaseAdmin().from("system_messages").insert({ user_id: post.user_id, type: "anonymous_reply", title: "New anonymous reply", body: text.slice(0, 180) });
    return NextResponse.json({ reply: { ...reply, photo: replyPhoto } });
  } else {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
