import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { photo_path } = await req.json();
  if (typeof photo_path !== "string" || !photo_path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Upload a valid profile photo first." }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from("users").update({ profile_photo_url: photo_path }).eq("id", user.id);
  if (error) return NextResponse.json({ error: "Could not save your profile photo." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
