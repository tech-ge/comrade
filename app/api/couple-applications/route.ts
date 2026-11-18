import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { post_id, photo_url, message } = await req.json();
  if (!post_id || !message) return NextResponse.json({ error: "Post and message required" }, { status: 400 });

  const { error } = await sb.from("couple_applications").insert({
    post_id,
    applicant_id: user.id,
    photo_url: photo_url || "/placeholder-couple.png",
    message,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
