"use client";

import { useState } from "react";

export default function StoriesPage() {
  const [body, setBody] = useState("");
  const [targetScope, setTargetScope] = useState("school");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "story", body, target_scope: targetScope }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Story posted." : data.error || "Failed");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Share a story</h1>
      <form onSubmit={submit} className="card space-y-3">
        <textarea className="input" rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="What happened?" required />
        <select className="input" value={targetScope} onChange={(event) => setTargetScope(event.target.value)}>
          <option value="school">My school</option>
          <option value="county">My county</option>
          <option value="country">Whole Kenya</option>
        </select>
        <button className="btn-primary w-full">Post story</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
