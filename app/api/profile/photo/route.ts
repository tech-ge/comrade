import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  if (Object.prototype.hasOwnProperty.call(body, "username")) {
    const username = typeof body.username === "string" && body.username.trim() ? body.username.trim().replace(/^@/, "") : null;
    if (username && !/^[A-Za-z0-9_]{3,24}$/.test(username)) return NextResponse.json({ error: "Use 3–24 letters, numbers, or underscores." }, { status: 400 });
    const { error } = await supabaseAdmin().from("users").update({ username }).eq("id", user.id);
    if (error?.code === "23505") return NextResponse.json({ error: "That username is already in use." }, { status: 409 });
    if (error) return NextResponse.json({ error: "Could not update username." }, { status: 500 });
    return NextResponse.json({ ok: true, username });
  }
  const { photo_path } = body;
  if (typeof photo_path !== "string" || !photo_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Upload a valid profile photo first." }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("users").update({ profile_photo_url: photo_path }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not save your profile photo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
