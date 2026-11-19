import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export const dynamic = "force-dynamic";

export async function GET() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: stories } = await sb
    .from("stories")
    .select("id, body, image_url, is_event, target_scope, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);

  const data = await Promise.all((stories || []).map(async story => ({ ...story, image_url: await resolvePhotoUrl(story.image_url) })));
  return NextResponse.json({ data });
}
