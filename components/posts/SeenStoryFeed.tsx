"use client";

import { useEffect, useRef, useState } from "react";
import StoryCard from "@/components/posts/StoryCard";
import type { PostAuthorData } from "@/components/posts/PostAuthor";

type Reaction = "like" | "love" | "dislike" | "laugh" | "sad" | "angry" | "support";
type FeedStory = { id: string; user_id: string; body: string; image_url: string | null; is_event: boolean; target_scope: string; created_at: string; author: PostAuthorData; reactions: { story_id: string; type: Reaction; user_id: string }[]; comments: { id: string; story_id: string; user_id: string; parent_comment_id: string | null; body: string; image_url?: string | null; created_at: string; author_name: string; author_id?: string | null; author_photo?: string | null }[] };

export default function SeenStoryFeed({ initial, viewerId }: { initial: FeedStory[]; viewerId: string }) {
  const [stories, setStories] = useState(initial);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FeedStory[] | null>(null);
  const [olderOffset, setOlderOffset] = useState(0);
  const [hasOlder, setHasOlder] = useState(true);
  const recorded = useRef(new Set<string>());

  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      const seen = entries.filter(entry => entry.isIntersecting).map(entry => (entry.target as HTMLElement).dataset.storyId).filter((id): id is string => typeof id === "string" && !recorded.current.has(id));
      if (!seen.length) return;
      seen.forEach(id => recorded.current.add(id));
      void fetch("/api/stories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ story_ids: seen }) });
    }, { threshold: 0.4 });
    document.querySelectorAll<HTMLElement>("[data-story-id]").forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, [stories, searchResults]);

  async function loadNew() {
    if (refreshing) return;
    setRefreshing(true); setMessage("");
    try {
      const url = new URL("/api/stories", window.location.origin);
      url.searchParams.set("limit", "10");
      url.searchParams.set("exclude", stories.map(story => story.id).join(","));
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load posts.");
      const fresh: FeedStory[] = (data.stories || []).filter((story: FeedStory) => !stories.some(existing => existing.id === story.id));
      setStories(current => [...current, ...fresh]);
      setMessage(fresh.length ? `${fresh.length} new posts loaded.` : "You’re all caught up. Check again later.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load posts."); }
    finally { setRefreshing(false); }
  }

  async function loadOlder() {
    if (refreshing || !hasOlder) return;
    setRefreshing(true); setMessage("");
    try {
      const url = new URL("/api/stories", window.location.origin);
      url.searchParams.set("older", "1"); url.searchParams.set("offset", String(olderOffset)); url.searchParams.set("limit", "10");
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load older posts.");
      const page: FeedStory[] = data.stories || [];
      const fresh = page.filter(story => !stories.some(existing => existing.id === story.id));
      setStories(current => [...current, ...fresh]);
      setOlderOffset(current => current + page.length);
      setHasOlder(Boolean(data.hasMoreOlder));
      setMessage(fresh.length ? `${fresh.length} older posts loaded.` : data.hasMoreOlder ? "You’ve reached posts already in your feed. Continue for older posts." : "You’ve reached the oldest posts.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not load older posts."); }
    finally { setRefreshing(false); }
  }

  async function searchPosts(event: React.FormEvent) {
    event.preventDefault();
    if (!search.trim()) { setSearchResults(null); return; }
    setSearching(true); setMessage("");
    try {
      const url = new URL("/api/stories", window.location.origin);
      url.searchParams.set("q", search.trim()); url.searchParams.set("limit", "30");
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Search failed.");
      setSearchResults(data.stories || []);
      setMessage(data.stories?.length ? `${data.stories.length} matching posts.` : "No matching posts found.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Search failed."); }
    finally { setSearching(false); }
  }

  return <>
    <form className="feed-search" onSubmit={searchPosts}><input className="input" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search posts, including ones you’ve seen" /><button className="btn-secondary" disabled={searching}>{searching ? "Searching…" : "Search"}</button>{searchResults && <button className="feed-clear-search" type="button" onClick={() => { setSearchResults(null); setSearch(""); setMessage(""); }}>Clear</button>}</form>
    {!searchResults && <div className="feed-new-posts"><button type="button" className="btn-secondary" onClick={() => void loadNew()} disabled={refreshing}>{refreshing ? "Checking…" : "↓ Load more new posts"}</button>{message && <span role="status">{message}</span>}</div>}
    {message && searchResults && <p className="feed-search-message" role="status">{message}</p>}
    {!(searchResults || stories).length ? <p className="text-brand-gray text-sm">No new posts are available. Browse older posts below.</p> : <ul className="feed-list">{(searchResults || stories).map(story => {
      const counts = Object.fromEntries(("like love dislike laugh sad angry support".split(" ") as Reaction[]).map(type => [type, story.reactions.filter(row => row.type === type).length])) as Record<Reaction, number>;
      return <li key={story.id} data-story-id={story.id}><StoryCard story={story} author={story.author} counts={counts} mine={story.reactions.filter(row => row.user_id === viewerId).map(row => row.type)} initialComments={story.comments.slice(0, 3)} /></li>;
    })}</ul>}
    {!searchResults && <div className="feed-new-posts feed-older-posts"><button type="button" className="btn-secondary" onClick={() => void loadOlder()} disabled={refreshing || !hasOlder}>{refreshing ? "Loading…" : hasOlder ? "Browse older posts" : "You’ve reached the oldest posts"}</button></div>}
  </>;
}
