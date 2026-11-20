"use client";

import { useState } from "react";

export default function AnonymousPostComposer() {
  const [body, setBody] = useState("");
  const [targetScope, setTargetScope] = useState("school");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/content", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "anonymous", body, target_scope: targetScope }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not publish.");
      setBody(""); setMessage("Anonymous post published."); window.location.reload();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not publish."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="card anonymous-composer">
    <textarea className="input" rows={4} value={body} onChange={event => setBody(event.target.value)} placeholder="Share your message anonymously…" required maxLength={3000} />
    <select className="input" value={targetScope} onChange={event => setTargetScope(event.target.value)}><option value="school">My school</option><option value="county">My county</option><option value="country">Whole Kenya</option></select>
    <button className="btn-primary" disabled={busy}>{busy ? "Posting…" : "Post anonymously"}</button>{message && <p role="status">{message}</p>}
  </form>;
}
