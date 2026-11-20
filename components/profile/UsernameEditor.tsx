"use client";

import { useState } from "react";

export default function UsernameEditor({ current }: { current: string | null }) {
  const [username, setUsername] = useState(current || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/profile/photo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save username.");
      setUsername(data.username || ""); setMessage(data.username ? "Username saved." : "Username removed. Your Comrade ID will be shown instead.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save username.");
    } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/profile/photo", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: "" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not remove username.");
      setUsername(""); setMessage("Username removed. Your Comrade ID will be shown instead.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove username."); }
    finally { setBusy(false); }
  }
  return <form className="username-editor" onSubmit={save}>
    <label htmlFor="profile-username">Public username</label>
    <p>People see this on your posts. Leave it blank to use your Comrade ID.</p>
    <div><span>@</span><input id="profile-username" className="input" value={username} onChange={event => setUsername(event.target.value)} maxLength={24} pattern="[A-Za-z0-9_]{3,24}" placeholder="yourname" /><button className="admin-action primary" disabled={busy}>{busy ? "Saving…" : "Save"}</button></div>
    <button className="username-remove" type="button" disabled={busy || !username} onClick={() => void remove()}>Remove username</button>
    {message && <small role="status">{message}</small>}
  </form>;
}
