import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { data: profile } = await sb
    .from("users")
    .select("university_id")
    .eq("id", user.id)
    .single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });

  if (body.type === "story") {
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
    const { error } = await sb.from("help_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      help_type: body.help_type,
      description: body.description,
      proof_url: body.proof_url || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "advice") {
    const { error } = await sb.from("advice_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      what_happened: body.what_happened,
      advice_needed: body.advice_needed,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else if (body.type === "anonymous") {
    const { error } = await sb.from("anonymous_posts").insert({
      user_id: user.id,
      university_id: profile.university_id,
      body: body.body,
      target_scope: body.target_scope || "school",
      target_county_id: body.target_county_id || null,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  } else {
    return NextResponse.json({ error: "Unknown content type" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
