import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const REACTIONS = ["like", "love", "support"] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: story } = await sb.from("stories").select("id").eq("id", params.id).single();
  if (!story) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const admin = supabaseAdmin();
  const [{ data: reactions }, commentsResult] = await Promise.all([
    admin.from("story_reactions").select("type, user_id").eq("story_id", params.id),
    admin.from("comments").select("id, body, created_at", { count: "exact" }).eq("story_id", params.id).order("created_at", { ascending: false }).limit(50),
  ]);
  const comments = commentsResult.data;
  const counts = Object.fromEntries(REACTIONS.map(type => [type, (reactions || []).filter(row => row.type === type).length]));
  const mine = (reactions || []).filter(row => row.user_id === user.id).map(row => row.type);
  return NextResponse.json({ counts, mine, comments: comments || [], comment_count: commentsResult.count || 0 });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: story } = await sb.from("stories").select("id").eq("id", params.id).single();
  if (!story) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const body = await req.json();
  const admin = supabaseAdmin();
  if (body.action === "reaction") {
    if (!REACTIONS.includes(body.type)) return NextResponse.json({ error: "Choose a valid reaction." }, { status: 400 });
    const { data: existingRows } = await admin.from("story_reactions").select("id, type").eq("story_id", params.id).eq("user_id", user.id);
    const existing = (existingRows || []).find(row => row.type === body.type);
    if (existing) {
      const { error } = await admin.from("story_reactions").delete().eq("id", existing.id);
      if (error) return NextResponse.json({ error: "Could not remove reaction." }, { status: 400 });
    } else {
      if (existingRows?.length) {
        const { error } = await admin.from("story_reactions").delete().eq("story_id", params.id).eq("user_id", user.id);
        if (error) return NextResponse.json({ error: "Could not update reaction." }, { status: 400 });
      }
      const { error } = await admin.from("story_reactions").insert({ story_id: params.id, user_id: user.id, type: body.type });
      if (error) return NextResponse.json({ error: "Could not add reaction." }, { status: 400 });
    }
    const { data: reactions } = await admin.from("story_reactions").select("type, user_id").eq("story_id", params.id);
    const counts = Object.fromEntries(REACTIONS.map(type => [type, (reactions || []).filter(row => row.type === type).length]));
    const mine = (reactions || []).filter(row => row.user_id === user.id).map(row => row.type);
    return NextResponse.json({ counts, mine });
  }

  if (body.action === "comment") {
    const text = typeof body.body === "string" ? body.body.trim() : "";
    if (!text || text.length > 1000) return NextResponse.json({ error: "Reply must be between 1 and 1,000 characters." }, { status: 400 });
    const { data: comment, error } = await admin.from("comments").insert({ story_id: params.id, user_id: user.id, body: text }).select("id, body, created_at").single();
    if (error) return NextResponse.json({ error: "Could not add reply." }, { status: 400 });
    return NextResponse.json({ comment });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
