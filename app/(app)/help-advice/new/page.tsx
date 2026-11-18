"use client";

import { useState } from "react";

export default function NewHelpAdvicePage() {
  const [mode, setMode] = useState("help");
  const [helpType, setHelpType] = useState("other");
  const [description, setDescription] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [adviceNeeded, setAdviceNeeded] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = mode === "help"
      ? { type: "help", help_type: helpType, description }
      : { type: "advice", what_happened: whatHappened, advice_needed: adviceNeeded };
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    setMessage(response.ok ? "Published." : data.error || "Failed");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Ask for support</h1>
      <div className="flex gap-2 mb-4">
        <button className={mode === "help" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("help")}>Help</button>
        <button className={mode === "advice" ? "btn-primary" : "btn-secondary"} onClick={() => setMode("advice")}>Advice</button>
      </div>
      <form onSubmit={submit} className="card space-y-3">
        {mode === "help" ? (
          <>
            <select className="input" value={helpType} onChange={(event) => setHelpType(event.target.value)}>
              <option value="comments">Comments</option>
              <option value="money">Money</option>
              <option value="food">Food</option>
              <option value="notes">Notes</option>
              <option value="hostel">Hostel</option>
              <option value="mental_health">Mental health</option>
              <option value="other">Other</option>
            </select>
            <textarea className="input" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} required />
          </>
        ) : (
          <>
            <textarea className="input" rows={4} value={whatHappened} onChange={(event) => setWhatHappened(event.target.value)} placeholder="What happened?" required />
            <textarea className="input" rows={4} value={adviceNeeded} onChange={(event) => setAdviceNeeded(event.target.value)} placeholder="What advice do you need?" required />
          </>
        )}
        <button className="btn-primary w-full">Publish</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
