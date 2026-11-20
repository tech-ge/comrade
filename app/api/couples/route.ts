import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await sb.from("couple_posts").select("*")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const posts = await Promise.all((data || []).map(async post => ({ ...post, photo_url: await resolvePhotoUrl(post.photo_url) || "/placeholder-couple.png" })));
  return NextResponse.json({ data: posts });
}

export async function PATCH(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { post_id } = await req.json();
  const admin = supabaseAdmin();
  const { data: post } = await admin.from("couple_posts").select("id,user_id,status").eq("id", post_id).maybeSingle();
  if (!post || post.status !== "active") return NextResponse.json({ error: "Post unavailable" }, { status: 404 });
  if (post.user_id !== user.id) {
    const { error } = await admin.from("couple_post_views").insert({ post_id, viewer_id: user.id });
    if (error && error.code !== "23505") return NextResponse.json({ error: "Could not record view." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (typeof body.photo_path !== "string" || !body.photo_path.startsWith(`${user.id}/`)) return NextResponse.json({ error: "Upload a photo before creating a couple search." }, { status: 400 });
  if (typeof body.description !== "string" || !body.description.trim()) return NextResponse.json({ error: "Describe who you are hoping to meet." }, { status: 400 });
  const { data: profile } = await sb.from("users").select("university_id, gender, read_only").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Complete your profile before creating a couple search." }, { status: 400 });
  if (profile.read_only) return NextResponse.json({ error: "Your account is read-only while reports are reviewed." }, { status: 403 });
  const posterGender = profile.gender === "male" || profile.gender === "female" ? profile.gender : "male";
  const lookingFor = posterGender === "male" ? "female" : "male";

  const { data, error } = await sb.from("couple_posts").insert({
    user_id: user.id,
    university_id: profile.university_id,
    photo_url: body.photo_path || "/placeholder-couple.png",
    description: body.description,
    poster_gender: profile.gender,
    looking_for_gender: lookingFor,
    target_scope: "country",
    target_county_id: null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
