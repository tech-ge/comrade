"use client";

import { useRef, useState, type FormEvent } from "react";
import { MessageCircle, ThumbsUp } from "lucide-react";

type Reaction = "like" | "love" | "dislike" | "laugh" | "sad" | "angry" | "support";
type Comment = { id: string; user_id?: string; parent_comment_id?: string | null; author_name?: string; body: string; created_at: string };

const reactionButtons: { type: Reaction; label: string; emoji: string }[] = [
  { type: "like", label: "Like", emoji: "👍" }, { type: "love", label: "Love", emoji: "❤️" },
  { type: "dislike", label: "Dislike", emoji: "👎" }, { type: "laugh", label: "Funny", emoji: "😂" },
  { type: "sad", label: "Sad", emoji: "😢" }, { type: "angry", label: "Angry", emoji: "😡" },
  { type: "support", label: "Support", emoji: "🤝" },
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
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [suppressClick, setSuppressClick] = useState(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        body: JSON.stringify({ action: "comment", body: text, parent_comment_id: replyTo?.id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply failed.");
      setComments(previous => [...previous, data.comment]);
      setCommentCount(previous => previous === null ? null : previous + 1);
      setReply(""); setReplyTo(null); setShowReplies(true);
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
        <span>{reactionButtons.filter(item => reactionCounts[item.type] > 0).map(item => `${item.emoji} ${reactionCounts[item.type]}`).join("  ") || "Be the first to react"}</span>
        <button type="button" onClick={() => void toggleReplies()}>{commentCount === null ? "Replies" : `${commentCount} replies`}</button>
      </div>
      <div className="story-card-actions">
        <div className="story-reaction-wrap" onPointerDown={() => { holdTimer.current = setTimeout(() => { setSuppressClick(true); setShowReactionPicker(true); }, 520); }} onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }} onPointerLeave={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }}>
          <button type="button" className={`story-action${myReactions.length ? " selected" : ""}`} onClick={() => { if (suppressClick) { setSuppressClick(false); return; } void react("like"); }} aria-label="React to this post"><ThumbsUp size={18} /><span>{reactionButtons.find(item => myReactions.includes(item.type))?.label || "Like"}</span></button>
          {showReactionPicker && <div className="story-reaction-picker" role="group" aria-label="Choose reaction">{reactionButtons.map(item => <button key={item.type} type="button" title={item.label} aria-label={item.label} onClick={() => { void react(item.type); setShowReactionPicker(false); }}>{item.emoji}</button>)}</div>}
        </div>
        <button type="button" className="story-action" onClick={() => void toggleReplies()}><MessageCircle size={18} /><span>Comment</span></button>
      </div>
      {showReplies && <section className="story-replies">
        {comments.length > 0 && <ul className="story-reply-list">{comments.filter(comment => !comment.parent_comment_id).map(comment => (
          <li key={comment.id} className="story-reply"><span className="story-reply-avatar">{(comment.author_name || "C")[0]}</span><div><strong>{comment.author_name || "Comrade"}</strong><p>{comment.body}</p><time>{new Date(comment.created_at).toLocaleString()}</time><button className="story-reply-button" type="button" onClick={() => { setReplyTo(comment); setShowReplies(true); }}>Reply</button>
            {comments.filter(child => child.parent_comment_id === comment.id).map(child => <div className="story-nested-reply" key={child.id}><strong>{child.author_name || "Comrade"}</strong><p>{child.body}</p><time>{new Date(child.created_at).toLocaleString()}</time></div>)}
          </div></li>
        ))}</ul>}
        {replyTo && <div className="story-replying-to">Replying to {replyTo.author_name || "Comrade"}<button type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
        <form onSubmit={sendReply} className="story-reply-form">
          <input className="input" value={reply} onChange={event => setReply(event.target.value)} maxLength={1000} placeholder="Write a reply…" aria-label="Write a reply" />
          <button className="btn-primary" disabled={busy || !reply.trim()}>{busy ? "Sending…" : "Reply"}</button>
        </form>
      </section>}
      {message && <p className="story-card-message" role="status">{message}</p>}
    </article>
  );
}
