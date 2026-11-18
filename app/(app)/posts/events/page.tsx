"use client";

import { useState } from "react";

export default function EventsPage() {
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "story", body, is_event: true, target_scope: "school" }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Event posted." : data.error || "Failed");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Post an event</h1>
      <form onSubmit={submit} className="card space-y-3">
        <textarea className="input" rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="Event details" required />
        <button className="btn-primary w-full">Post event</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
