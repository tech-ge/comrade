import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import StoryCard from "@/components/posts/StoryCard";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: storyRows } = await sb
    .from("stories")
    .select("id, body, image_url, is_event, target_scope, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const storyIds = (storyRows || []).map(story => story.id);
  let reactionRows: { story_id: string; type: string; user_id: string }[] = [];
  let commentRows: { id: string; story_id: string; body: string; created_at: string }[] = [];
  if (storyIds.length) {
    const [reactionsResult, commentsResult] = await Promise.all([
      sb.from("story_reactions").select("story_id, type, user_id").in("story_id", storyIds),
      sb.from("comments").select("id, story_id, body, created_at").in("story_id", storyIds).order("created_at", { ascending: false }).limit(120),
    ]);
    reactionRows = reactionsResult.data || [];
    commentRows = commentsResult.data || [];
  }
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
            counts={{
              like: reactions.filter(row => row.type === "like").length,
              love: reactions.filter(row => row.type === "love").length,
              support: reactions.filter(row => row.type === "support").length,
            }}
            mine={reactions.filter(row => row.user_id === user.id).map(row => row.type as "like" | "love" | "support")}
            initialComments={storyComments}
          /></li>;
        })}
      </ul>
    </main>
  );
}
