"use client";

import { useState } from "react";

type Reply = { id: string; body: string; created_at: string; photo?: string | null };
export default function AnonymousPostCard({ post, replies }: { post: { id: string; body: string; target_scope: string; created_at: string; photo: string | null }; replies: Reply[] }) {
  const [items, setItems] = useState(replies);
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function reply(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "anonymous_reply", post_id: post.id, body }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reply.");
      setItems(current => [...current, data.reply]); setBody("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reply."); }
    finally { setBusy(false); }
  }
  return <article className="anonymous-post-card">
    <header className="anonymous-post-author">{post.photo ? <img src={post.photo} alt="" /> : <span>A</span>}<div><strong>Anonymous</strong></div></header>
    <p className="anonymous-post-body">{post.body}</p>
    <section className="anonymous-replies">{items.map(item => <div className="anonymous-reply" key={item.id}>{item.photo ? <img src={item.photo} alt="" /> : <span>A</span>}<p><strong>Anonymous</strong><br />{item.body}</p></div>)}
      <form onSubmit={reply}><input className="input" value={body} onChange={event => setBody(event.target.value)} maxLength={1000} placeholder="Reply anonymously…" required /><button className="btn-secondary" disabled={busy}>{busy ? "Sending…" : "Reply"}</button></form>
      {message && <small role="status">{message}</small>}
    </section>
  </article>;
}
