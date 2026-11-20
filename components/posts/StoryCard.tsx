"use client";

import { useState, type FormEvent } from "react";
import { Heart, MessageCircle, ThumbsUp } from "lucide-react";

type Reaction = "like" | "love" | "support";
type Comment = { id: string; body: string; created_at: string };

const reactionButtons: { type: Reaction; label: string; icon: typeof ThumbsUp }[] = [
  { type: "like", label: "Like", icon: ThumbsUp },
  { type: "love", label: "Love", icon: Heart },
  { type: "support", label: "Support", icon: MessageCircle },
];

export default function StoryCard({ story, counts, mine, initialComments }: {
  story: { id: string; body: string; image_url: string | null; is_event: boolean; target_scope: string; created_at: string };
  counts: Record<Reaction, number>;
  mine: Reaction[];
  initialComments: Comment[];
}) {
  const [reactionCounts, setReactionCounts] = useState(counts);
  const [myReactions, setMyReactions] = useState(mine);
  const [comments, setComments] = useState(initialComments);
  const [commentCount, setCommentCount] = useState<number | null>(null);
  const [showReplies, setShowReplies] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function toggleReplies() {
    const next = !showReplies;
    setShowReplies(next);
    if (!next) return;
    const response = await fetch(`/api/stories/${story.id}/interactions`);
    const data = await response.json();
    if (response.ok) {
      setComments(data.comments || []);
      setCommentCount(data.comment_count || 0);
      setReactionCounts(data.counts || reactionCounts);
      setMyReactions(data.mine || []);
    }
  }

  async function react(type: Reaction) {
    setMessage("");
    const response = await fetch(`/api/stories/${story.id}/interactions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reaction", type }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error || "Reaction failed."); return; }
    setReactionCounts(data.counts || reactionCounts);
    setMyReactions(data.mine || []);
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    if (!text) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/stories/${story.id}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", body: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply failed.");
      setComments(previous => [data.comment, ...previous]);
      setCommentCount(previous => previous === null ? null : previous + 1);
      setReply(""); setShowReplies(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reply failed.");
    } finally { setBusy(false); }
  }

  return (
    <article className="story-social-card">
      <header className="story-card-header">
        <div className="story-author-avatar" aria-hidden="true">C</div>
        <div className="min-w-0 flex-1">
          <p className="story-author-name">Campus community</p>
          <p className="story-card-subtitle">{story.target_scope} · {new Date(story.created_at).toLocaleString()}</p>
        </div>
        {story.is_event && <span className="story-event-badge">Event</span>}
      </header>
      <p className="story-card-body">{story.body}</p>
      {story.image_url && <img src={story.image_url} alt="" loading="lazy" className="story-card-image" />}
      <div className="story-card-stats">
        <span>{reactionButtons.reduce((total, item) => total + reactionCounts[item.type], 0)} reactions</span>
        <button type="button" onClick={() => void toggleReplies()}>{commentCount === null ? "Replies" : `${commentCount} replies`}</button>
      </div>
      <div className="story-card-actions">
        {reactionButtons.map(({ type, label, icon: Icon }) => (
          <button key={type} type="button" className={`story-action${myReactions.includes(type) ? " selected" : ""}`} onClick={() => void react(type)} aria-pressed={myReactions.includes(type)}>
            <Icon size={18} /> <span>{label}</span><small>{reactionCounts[type]}</small>
          </button>
        ))}
        <button type="button" className="story-action" onClick={() => void toggleReplies()}><MessageCircle size={18} /><span>Reply</span></button>
      </div>
      {showReplies && <section className="story-replies">
        {comments.length > 0 && <ul className="story-reply-list">{comments.slice(0, 8).map(comment => (
          <li key={comment.id} className="story-reply"><span className="story-reply-avatar">C</span><div><strong>Comrade</strong><p>{comment.body}</p><time>{new Date(comment.created_at).toLocaleString()}</time></div></li>
        ))}</ul>}
        <form onSubmit={sendReply} className="story-reply-form">
          <input className="input" value={reply} onChange={event => setReply(event.target.value)} maxLength={1000} placeholder="Write a reply…" aria-label="Write a reply" />
          <button className="btn-primary" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Reply"}</button>
        </form>
      </section>}
      {message && <p className="story-card-message" role="status">{message}</p>}
    </article>
  );
}
