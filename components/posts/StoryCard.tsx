"use client";

import { useRef, useState, type FormEvent } from "react";
import { MessageCircle, ThumbsUp } from "lucide-react";
import PostAuthor, { type PostAuthorData } from "@/components/posts/PostAuthor";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

type Reaction = "like" | "love" | "dislike" | "laugh" | "sad" | "angry" | "support";
type Comment = { id: string; user_id?: string; parent_comment_id?: string | null; author_name?: string; author_id?: string | null; author_photo?: string | null; body: string; image_url?: string | null; created_at: string };

const reactionButtons: { type: Reaction; label: string; emoji: string }[] = [
  { type: "like", label: "Like", emoji: "👍" }, { type: "love", label: "Love", emoji: "❤️" },
  { type: "dislike", label: "Dislike", emoji: "👎" }, { type: "laugh", label: "Funny", emoji: "😂" },
  { type: "sad", label: "Sad", emoji: "😢" }, { type: "angry", label: "Angry", emoji: "😡" },
  { type: "support", label: "Support", emoji: "🤝" },
];

export default function StoryCard({ story, counts, mine, initialComments, author }: {
  story: { id: string; body: string; image_url: string | null; is_event: boolean; target_scope: string; created_at: string };
  author: PostAuthorData;
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
  const [replyImage, setReplyImage] = useState("");
  const [photoReset, setPhotoReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [expandedBody, setExpandedBody] = useState(false);
  const [expandedCommentIds, setExpandedCommentIds] = useState<Set<string>>(new Set());
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [reportMessage, setReportMessage] = useState("");
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

  async function report(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "report", target_type: "story", target_id: story.id, reason: reportNote }) });
    const data = await response.json();
    if (response.ok) { setReportMessage("Report sent for admin review."); setReportNote(""); setReportOpen(false); }
    else setReportMessage(data.error || "Could not send report.");
  }

  async function sendReply(event: FormEvent) {
    event.preventDefault();
    const text = reply.trim();
    if (!text && !replyImage) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch(`/api/stories/${story.id}/interactions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "comment", body: text, image_url: replyImage || null, parent_comment_id: replyTo?.id || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Reply failed.");
      setComments(previous => [...previous, data.comment]);
      setCommentCount(previous => previous === null ? null : previous + 1);
      setReply(""); setReplyImage(""); setPhotoReset(value => value + 1); setReplyTo(null); setShowReplies(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reply failed.");
    } finally { setBusy(false); }
  }

  function renderComment(comment: Comment): React.ReactNode {
    const children = comments.filter(item => item.parent_comment_id === comment.id);
    const expanded = expandedCommentIds.has(comment.id);
    return <li key={comment.id} className="story-reply">
      {comment.author_photo ? <img className="story-reply-avatar" src={comment.author_photo} alt="" /> : <span className="story-reply-avatar">{(comment.author_name || "C")[0]}</span>}
      <div className="story-reply-content"><strong>{comment.author_name || "Comrade"}</strong>{comment.author_id && <small className="story-comment-id">Comrade ID {comment.author_id}</small>}{comment.body && <p>{comment.body}</p>}{comment.image_url && <img className="story-comment-image" src={comment.image_url} alt="Comment attachment" loading="lazy" />}<time>{new Date(comment.created_at).toLocaleString()}</time>
        <button className="story-reply-button" type="button" onClick={() => { setReplyTo(comment); setShowReplies(true); }}>Reply</button>
        {children.length > 0 && <button className="story-reply-button" type="button" onClick={() => setExpandedCommentIds(previous => { const next = new Set(previous); if (next.has(comment.id)) next.delete(comment.id); else next.add(comment.id); return next; })}>{expanded ? "Hide replies" : `View replies (${children.length})`}</button>}
        {expanded && children.length > 0 && <ul className="story-nested-list">{children.map(renderComment)}</ul>}
      </div>
    </li>;
  }

  return (
    <article className="story-social-card">
      <header className="story-card-header">
        <PostAuthor author={author} />
        <div className="min-w-0 flex-1">
          <p className="story-card-subtitle">{story.target_scope} · {new Date(story.created_at).toLocaleString()}</p>
        </div>
        {story.is_event && <span className="story-event-badge">Event</span>}
      </header>
      <p className={`story-card-body${expandedBody ? "" : " clamped"}`}>{story.body}</p>
      {story.body.length > 120 && <button type="button" className="story-read-more" onClick={() => setExpandedBody(value => !value)}>{expandedBody ? "See less" : "Read more"}</button>}
      {story.image_url && <img src={story.image_url} alt="" loading="lazy" className="story-card-image" />}
      <div className="story-card-stats">
        <span>{reactionButtons.filter(item => reactionCounts[item.type] > 0).map(item => `${item.emoji} ${reactionCounts[item.type]}`).join("  ") || "Be the first to react"}</span>
        <button type="button" onClick={() => void toggleReplies()}>{commentCount === null ? "Replies" : `${commentCount} replies`}</button>
      </div>
      <div className="story-card-actions">
        <div className="story-reaction-wrap" onPointerDown={() => { if (holdTimer.current) clearTimeout(holdTimer.current); holdTimer.current = setTimeout(() => { setSuppressClick(true); setShowReactionPicker(true); }, 520); }} onPointerUp={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }} onPointerLeave={() => { if (holdTimer.current) clearTimeout(holdTimer.current); }}>
          <button type="button" className={`story-action${myReactions.length ? " selected" : ""}`} onClick={() => { if (suppressClick) { setSuppressClick(false); return; } void react("like"); }} aria-label="React to this post"><ThumbsUp size={18} /><span>{reactionButtons.find(item => myReactions.includes(item.type))?.label || "Like"}</span></button>
          {showReactionPicker && <div className="story-reaction-picker" role="group" aria-label="Choose reaction">{reactionButtons.map(item => <button key={item.type} type="button" title={item.label} aria-label={item.label} onClick={() => { void react(item.type); setShowReactionPicker(false); }}>{item.emoji}</button>)}</div>}
        </div>
        <button type="button" className="story-action" onClick={() => void toggleReplies()}><MessageCircle size={18} /><span>Comment</span></button>
        <button type="button" className="story-action" onClick={() => setReportOpen(value => !value)}><span>Report</span></button>
      </div>
      {reportOpen && <form className="story-report-form" onSubmit={report}><textarea className="input" rows={2} maxLength={1000} value={reportNote} onChange={event => setReportNote(event.target.value)} placeholder="Add an optional note for the admin" /><button className="btn-secondary">Send report</button></form>}
      {reportMessage && <p className="story-card-message" role="status">{reportMessage}</p>}
      {showReplies && <section className="story-replies">
        {comments.length > 0 && <ul className="story-reply-list">{comments.filter(comment => !comment.parent_comment_id).map(renderComment)}</ul>}
        {replyTo && <div className="story-replying-to">Replying to {replyTo.author_name || "Comrade"}<button type="button" onClick={() => setReplyTo(null)}>Cancel</button></div>}
        <form onSubmit={sendReply} className="story-reply-form">
          <input className="input" value={reply} onChange={event => setReply(event.target.value)} maxLength={1000} placeholder="Write a reply…" aria-label="Write a reply" />
          <PhotoUploadField resetKey={photoReset} label="Add photo" onUploaded={path => setReplyImage(path)} />
          <button className="btn-primary" disabled={busy || (!reply.trim() && !replyImage)}>{busy ? "Sending…" : "Reply"}</button>
        </form>
      </section>}
      {message && <p className="story-card-message" role="status">{message}</p>}
    </article>
  );
}
