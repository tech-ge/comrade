import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json();
  if (!body || body.trim().length < 3) {
    return NextResponse.json({ error: "Message too short" }, { status: 400 });
  }

  const { data: profile } = await sb.from("users").select("university_id").eq("id", user.id).single();
  if (!profile) return NextResponse.json({ error: "Profile incomplete" }, { status: 400 });

  const { error } = await sb.from("suggestions").insert({
    user_id: user.id,
    university_id: profile.university_id,
    body: body.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}