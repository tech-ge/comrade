"use client";

import { useState } from "react";

export default function AnonymousPage() {
  const [body, setBody] = useState("");
  const [targetScope, setTargetScope] = useState("school");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "anonymous", body, target_scope: targetScope }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Anonymous post published." : data.error || "Failed");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Anonymous post</h1>
      <p className="text-sm text-brand-gray mb-3">AAL2 MFA is required for posting.</p>
      <form onSubmit={submit} className="card space-y-3">
        <textarea className="input" rows={5} value={body} onChange={(event) => setBody(event.target.value)} required />
        <select className="input" value={targetScope} onChange={(event) => setTargetScope(event.target.value)}>
          <option value="school">My school</option>
          <option value="county">My county</option>
          <option value="country">Whole Kenya</option>
        </select>
        <button className="btn-primary w-full">Post anonymously</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
