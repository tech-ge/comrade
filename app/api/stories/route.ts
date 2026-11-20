import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export async function GET(request: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const limit = Math.max(1, Math.min(30, Number(searchParams.get("limit") || 10)));
  const older = searchParams.get("older") === "1";
  const offset = Math.max(0, Math.min(100_000, Number(searchParams.get("offset") || 0)));
  const search = (searchParams.get("q") || "").trim().slice(0, 100).replace(/[%,()]/g, "");
  const excludeIds = (searchParams.get("exclude") || "").split(",").filter(id => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 30);
  const admin = supabaseAdmin();
  const { data: seenRows } = await admin.from("story_views").select("story_id").eq("user_id", user.id);
  const seenIds = (search || older) ? [] : [...new Set([...(seenRows || []).map(row => row.story_id), ...excludeIds])];
  let query = sb.from("stories").select("id,user_id,body,image_url,is_event,target_scope,created_at", { count: "exact" }).eq("status", "active").order("created_at", { ascending: false }).limit(limit);
  if (search) query = query.ilike("body", `%${search}%`);
  if (seenIds.length) query = query.not("id", "in", `(${seenIds.join(",")})`);
  if (older) query = query.range(offset, offset + limit - 1);
  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: "Could not load new posts." }, { status: 400 });
  const ids = (data || []).map(story => story.id);
  const [{ data: reactions }, { data: comments }] = ids.length ? await Promise.all([
    admin.from("story_reactions").select("story_id,type,user_id").in("story_id", ids),
    admin.from("comments").select("id,story_id,user_id,parent_comment_id,body,image_url,created_at").in("story_id", ids).order("created_at", { ascending: true }),
  ]) : [{ data: [] }, { data: [] }];
  const userIds = [...new Set([...(data || []).map(row => row.user_id), ...(comments || []).map(row => row.user_id)])];
  const { data: users } = userIds.length ? await admin.from("users").select("id,full_name,first_name,username,public_id,profile_photo_url,deleted_at").in("id", userIds) : { data: [] };
  const authors = new Map(await Promise.all((users || []).map(async person => [person.id, { full_name: person.deleted_at ? "Deleted user" : person.full_name, first_name: person.deleted_at ? "Deleted" : person.first_name, username: person.deleted_at ? null : person.username, public_id: person.deleted_at ? null : person.public_id, publicId: person.deleted_at ? null : person.public_id, photo: person.deleted_at ? null : await resolvePhotoUrl(person.profile_photo_url), profile_photo: person.deleted_at ? null : await resolvePhotoUrl(person.profile_photo_url), deleted_at: person.deleted_at }] as const)));
  return NextResponse.json({ stories: await Promise.all((data || []).map(async story => ({ ...story, image_url: await resolvePhotoUrl(story.image_url), author: authors.get(story.user_id) || {}, reactions: (reactions || []).filter(row => row.story_id === story.id), comments: (comments || []).filter(row => row.story_id === story.id).map(row => ({ ...row, author_name: authors.get(row.user_id)?.username ? `@${authors.get(row.user_id)?.username}` : authors.get(row.user_id)?.publicId || authors.get(row.user_id)?.full_name || "Comrade", author_id: authors.get(row.user_id)?.publicId, author_photo: authors.get(row.user_id)?.photo })) }))), ...(older ? { hasMoreOlder: offset + (data || []).length < (count || 0) } : {}) });
}

export async function POST(request: Request) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { story_ids } = await request.json();
  if (!Array.isArray(story_ids) || story_ids.length > 30) return NextResponse.json({ error: "Invalid viewed posts." }, { status: 400 });
  const rows = [...new Set(story_ids.filter((id): id is string => typeof id === "string"))].map(story_id => ({ user_id: user.id, story_id }));
  if (rows.length) {
    const { error } = await supabaseAdmin().from("story_views").upsert(rows, { onConflict: "user_id,story_id", ignoreDuplicates: true });
    if (error) return NextResponse.json({ error: "Could not save viewed posts." }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
