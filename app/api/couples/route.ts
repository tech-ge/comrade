import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
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

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  if (body.photo_path && (typeof body.photo_path !== "string" || !body.photo_path.startsWith(`${user.id}/`))) return NextResponse.json({ error: "Upload your own photo first." }, { status: 400 });
  if (typeof body.description !== "string" || !body.description.trim()) return NextResponse.json({ error: "Describe who you are hoping to meet." }, { status: 400 });
  if (!["male", "female"].includes(body.poster_gender) || !["male", "female"].includes(body.looking_for_gender)) return NextResponse.json({ error: "Choose valid gender options." }, { status: 400 });
  if (!["country", "county", "school"].includes(body.target_scope)) return NextResponse.json({ error: "Choose a valid audience." }, { status: 400 });
  const { data: profile } = await sb.from("users").select("university_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });

  if (body.poster_gender === body.looking_for_gender) {
    return NextResponse.json({ error: "Gender pairing must differ" }, { status: 400 });
  }

  const { data, error } = await sb.from("couple_posts").insert({
    user_id: user.id,
    university_id: profile.university_id,
    photo_url: body.photo_path || "/placeholder-couple.png",
    description: body.description,
    poster_gender: body.poster_gender,
    looking_for_gender: body.looking_for_gender,
    target_scope: body.target_scope,
    target_county_id: body.target_county_id || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}
