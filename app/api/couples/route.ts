import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await sb.from("couple_posts").select("*")
    .eq("status", "active").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: profile } = await sb.from("users").select("university_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });

  if (body.poster_gender === body.looking_for_gender) {
    return NextResponse.json({ error: "Gender pairing must differ" }, { status: 400 });
  }

  const { data, error } = await sb.from("couple_posts").insert({
    user_id: user.id,
    university_id: profile.university_id,
    photo_url: body.photo_url || "/placeholder-couple.png",
    description: body.description,
    poster_gender: body.poster_gender,
    looking_for_gender: body.looking_for_gender,
    target_scope: body.target_scope,
    target_county_id: body.target_county_id || null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}