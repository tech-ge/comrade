"use client";
import { useState } from "react";
export default function SuggestionsPage() {
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  async function send(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/suggestions", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ body }) });
    const data = await res.json();
    setMsg(res.ok ? "Sent to admin" : data.error || "Failed");
  }
  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Suggestions</h1>
      <form onSubmit={send} className="space-y-3">
        <textarea className="input" rows={5} placeholder="Send a message to admin" value={body} onChange={e=>setBody(e.target.value)} required />
        <button className="btn-primary w-full">Send</button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </main>
  );
}
