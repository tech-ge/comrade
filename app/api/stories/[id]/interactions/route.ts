import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const REACTIONS = ["like", "love", "dislike", "laugh", "sad", "angry", "support"] as const;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: story } = await sb.from("stories").select("id,user_id").eq("id", params.id).single();
  if (!story) return NextResponse.json({ error: "Post not found" }, { status: 404 });

  const admin = supabaseAdmin();
  const [{ data: reactions }, commentsResult] = await Promise.all([
    admin.from("story_reactions").select("type, user_id").eq("story_id", params.id),
    admin.from("comments").select("id,user_id,parent_comment_id,body,created_at", { count: "exact" }).eq("story_id", params.id).order("created_at", { ascending: true }).limit(200),
  ]);
  const comments = commentsResult.data || [];
  const authorIds = [...new Set(comments.map(comment => comment.user_id))];
  const { data: authors } = authorIds.length ? await admin.from("users").select("id,full_name,first_name").in("id", authorIds) : { data: [] };
  const names = new Map((authors || []).map(author => [author.id, author.full_name || author.first_name || "Comrade"]));
  const commentsWithAuthors = comments.map(comment => ({ ...comment, author_name: names.get(comment.user_id) || "Comrade" }));
  const counts = Object.fromEntries(REACTIONS.map(type => [type, (reactions || []).filter(row => row.type === type).length]));
  const mine = (reactions || []).filter(row => row.user_id === user.id).map(row => row.type);
  return NextResponse.json({ counts, mine, comments: commentsWithAuthors, comment_count: commentsResult.count || 0, owner_id: story.user_id });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: story } = await sb.from("stories").select("id,user_id,body").eq("id", params.id).single();
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
    const parentId = typeof body.parent_comment_id === "string" ? body.parent_comment_id : null;
    let notifyUserId = story.user_id;
    if (parentId) {
      const { data: parent } = await admin.from("comments").select("id,user_id,story_id").eq("id", parentId).eq("story_id", params.id).maybeSingle();
      if (!parent) return NextResponse.json({ error: "That comment is no longer available." }, { status: 404 });
      notifyUserId = parent.user_id;
    }
    const { data: comment, error } = await admin.from("comments").insert({ story_id: params.id, user_id: user.id, body: text, parent_comment_id: parentId }).select("id,user_id,parent_comment_id,body,created_at").single();
    if (error) return NextResponse.json({ error: "Could not add reply." }, { status: 400 });
    const { data: author } = await admin.from("users").select("full_name,first_name").eq("id", user.id).maybeSingle();
    if (notifyUserId !== user.id) await admin.from("system_messages").insert({
      user_id: notifyUserId,
      type: "comment",
      title: parentId ? "Someone replied to your comment" : "Someone commented on your post",
      body: `${author?.full_name || author?.first_name || "A comrade"}: ${text.slice(0, 180)}`,
    });
    return NextResponse.json({ comment: { ...comment, author_name: author?.full_name || author?.first_name || "Comrade" } });
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
