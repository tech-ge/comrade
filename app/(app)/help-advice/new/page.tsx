"use client";

import { useState } from "react";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

export default function NewHelpAdvicePage() {
  const [mode, setMode] = useState("help");
  const [helpType, setHelpType] = useState("other");
  const [description, setDescription] = useState("");
  const [whatHappened, setWhatHappened] = useState("");
  const [adviceNeeded, setAdviceNeeded] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const body = mode === "help"
      ? { type: "help", help_type: helpType, description, image_url: imagePath || null }
      : { type: "advice", what_happened: whatHappened, advice_needed: adviceNeeded, image_url: imagePath || null };
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
            <label className="block text-sm font-semibold">Describe what you need and any useful details
              <textarea className="input mt-1" rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explain what happened, what support would help, and any relevant details." required maxLength={3000} />
            </label>
          </>
        ) : (
          <>
            <label className="block text-sm font-semibold">What happened?
              <textarea className="input mt-1" rows={4} value={whatHappened} onChange={(event) => setWhatHappened(event.target.value)} placeholder="Share enough detail for someone to understand the situation." required maxLength={3000} />
            </label>
            <label className="block text-sm font-semibold">What advice would help?
              <textarea className="input mt-1" rows={4} value={adviceNeeded} onChange={(event) => setAdviceNeeded(event.target.value)} placeholder="Tell people what kind of guidance or perspective you need." required maxLength={2000} />
            </label>
          </>
        )}
        <PhotoUploadField label="Add a photo (optional)" onUploaded={path => setImagePath(path)} />
        <button className="btn-primary w-full">Publish</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
