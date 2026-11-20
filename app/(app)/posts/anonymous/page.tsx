import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import AnonymousPostComposer from "@/components/posts/AnonymousPostComposer";
import AnonymousPostCard from "@/components/posts/AnonymousPostCard";

export const dynamic = "force-dynamic";

export default async function AnonymousPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: posts } = await sb.from("anonymous_posts").select("id,user_id,body,target_scope,created_at").order("created_at", { ascending: false }).limit(50);
  const ids = (posts || []).map(post => post.id);
  const userIds = [...new Set((posts || []).map(post => post.user_id))];
  const [{ data: replies }, { data: authors }] = await Promise.all([
    ids.length ? supabaseAdmin().from("anonymous_replies").select("id,post_id,replier_id,body,created_at").in("post_id", ids).order("created_at", { ascending: true }).limit(500) : Promise.resolve({ data: [] }),
    userIds.length ? supabaseAdmin().from("users").select("id,profile_photo_url").in("id", userIds) : Promise.resolve({ data: [] }),
  ]);
  const replyIds = [...new Set((replies || []).map(reply => reply.replier_id))];
  const { data: replierRows } = replyIds.length ? await supabaseAdmin().from("users").select("id,profile_photo_url").in("id", replyIds) : { data: [] };
  const photos = new Map(await Promise.all([...(authors || []), ...(replierRows || [])].map(async author => [author.id, await resolvePhotoUrl(author.profile_photo_url)] as const)));
  return <main className="feed-page">
    <header className="feed-header"><div><p className="feed-eyebrow">SAY IT SAFELY</p><h1 className="text-2xl font-bold">Anonymous posts</h1></div></header>
    <AnonymousPostComposer />
    <ul className="feed-list anonymous-feed">{(posts || []).map(post => <li key={post.id}><AnonymousPostCard post={{ id: post.id, body: post.body, target_scope: post.target_scope, created_at: post.created_at, photo: photos.get(post.user_id) || null }} replies={(replies || []).filter(reply => reply.post_id === post.id).map(reply => ({ id: reply.id, body: reply.body, created_at: reply.created_at, photo: photos.get(reply.replier_id) }))} /></li>)}</ul>
    {!posts?.length && <p className="text-sm text-brand-gray">No anonymous posts yet.</p>}
  </main>;
}
