import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import StoryCard from "@/components/posts/StoryCard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: storyRows } = await sb
    .from("stories")
    .select("id, user_id, body, image_url, is_event, target_scope, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const storyIds = (storyRows || []).map(story => story.id);
  let reactionRows: { story_id: string; type: string; user_id: string }[] = [];
  let commentRows: { id: string; story_id: string; user_id: string; parent_comment_id: string | null; body: string; created_at: string }[] = [];
  if (storyIds.length) {
    const [reactionsResult, commentsResult] = await Promise.all([
      sb.from("story_reactions").select("story_id, type, user_id").in("story_id", storyIds),
      sb.from("comments").select("id, story_id, user_id, parent_comment_id, body, created_at").in("story_id", storyIds).order("created_at", { ascending: true }).limit(300),
    ]);
    reactionRows = reactionsResult.data || [];
    commentRows = commentsResult.data || [];
  }
  const commenterIds = [...new Set(commentRows.map(row => row.user_id))];
  const { data: commenters } = commenterIds.length ? await supabaseAdmin().from("users").select("id,full_name,first_name").in("id", commenterIds) : { data: [] };
  const commenterNames = new Map((commenters || []).map(person => [person.id, person.full_name || person.first_name || "Comrade"]));
  const authorIds = [...new Set((storyRows || []).map(story => story.user_id))];
  const { data: authorRows } = authorIds.length ? await supabaseAdmin().from("users").select("id,full_name,first_name,username,public_id,profile_photo_url,deleted_at").in("id", authorIds) : { data: [] };
  const authors = new Map(await Promise.all((authorRows || []).map(async author => [author.id, { ...author, profile_photo: await resolvePhotoUrl(author.profile_photo_url) }] as const)));
  const stories = await Promise.all((storyRows || []).map(async story => ({ ...story, image_url: await resolvePhotoUrl(story.image_url) })));

  return (
    <main className="feed-page">
      <header className="feed-header">
        <div>
          <p className="feed-eyebrow">YOUR CAMPUS COMMUNITY</p>
          <h1 className="text-2xl font-bold">Posts</h1>
        </div>
        <Link href="/posts/new" className="feed-create-link">Create post</Link>
      </header>
      <div className="feed-tabs">
        <span className="feed-tab-active">All</span>
        <Link href="/posts/events" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Events</Link>
        <Link href="/posts/stories" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Stories</Link>
        <Link href="/posts/anonymous" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Anonymous</Link>
        <Link href="/posts/matched" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Matched</Link>
      </div>
      {(stories || []).length === 0 && (
        <p className="text-brand-gray text-sm">No posts yet. Be the first.</p>
      )}
      <ul className="feed-list">
        {stories.map(story => {
          const reactions = reactionRows.filter(row => row.story_id === story.id);
          const storyComments = commentRows.filter(row => row.story_id === story.id).slice(0, 3);
          return <li key={story.id}><StoryCard
            story={story}
            author={authors.get(story.user_id) || {}}
            counts={{
              like: reactions.filter(row => row.type === "like").length,
              love: reactions.filter(row => row.type === "love").length,
              dislike: reactions.filter(row => row.type === "dislike").length,
              laugh: reactions.filter(row => row.type === "laugh").length,
              sad: reactions.filter(row => row.type === "sad").length,
              angry: reactions.filter(row => row.type === "angry").length,
              support: reactions.filter(row => row.type === "support").length,
            }}
            mine={reactions.filter(row => row.user_id === user.id).map(row => row.type as "like" | "love" | "dislike" | "laugh" | "sad" | "angry" | "support")}
            initialComments={storyComments.map(comment => ({ ...comment, author_name: commenterNames.get(comment.user_id) || "Comrade" }))}
          /></li>;
        })}
      </ul>
    </main>
  );
}
