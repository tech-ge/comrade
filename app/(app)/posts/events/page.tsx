"use client";

import { useState } from "react";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

export default function EventsPage() {
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", details: "" });
  const [imagePath, setImagePath] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoReset, setPhotoReset] = useState(0);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
    const response = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "story",
        body: `${form.title.trim()}\nWhen: ${form.date} at ${form.time}\nWhere: ${form.location.trim()}\n\n${form.details.trim()}`,
        image_url: imagePath || null,
        is_event: true,
        target_scope: "school",
      }),
    });
    const data = await response.json();
    if (response.ok) { setMessage("Event posted."); setForm({ title: "", date: "", time: "", location: "", details: "" }); setImagePath(""); setPhotoReset(value => value + 1); }
    else setMessage(data.error || "Failed");
    } finally { setBusy(false); }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Schedule an event</h1>
      <form onSubmit={submit} className="card space-y-3">
        <input className="input" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="Event name" required />
        <input className="input" type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} required />
        <input className="input" type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} required />
        <input className="input" value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Location" required />
        <textarea className="input" rows={4} value={form.details} onChange={(event) => setForm({ ...form, details: event.target.value })} placeholder="More details about the event" required />
        <PhotoUploadField resetKey={photoReset} label="Add an event photo (optional)" onUploaded={path => setImagePath(path)} />
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Posting…" : "Schedule event"}</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
