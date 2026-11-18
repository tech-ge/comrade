import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

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

  return NextResponse.json({ data: stories || [] });
}
