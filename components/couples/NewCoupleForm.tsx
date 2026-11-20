"use client";

import { useState } from "react";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

type County = { id: number; name: string };

export default function NewCoupleForm({ gender, counties: _counties, homeCountyId: _homeCountyId }: { gender: "male" | "female"; counties: County[]; homeCountyId: number | null }) {
  const lookingFor = gender === "male" ? "female" : "male";
  const [form, setForm] = useState({ description: "", target_scope: "country", target_county_id: "" });
  const [photoPath, setPhotoPath] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoReset, setPhotoReset] = useState(0);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMsg("");
    try {
      const response = await fetch("/api/couples", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, looking_for_gender: lookingFor, target_county_id: form.target_scope === "county" ? Number(form.target_county_id) : null, photo_path: photoPath || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post your search.");
      setMsg("Your search is public across Kenya. Interested people can apply from the post.");
      setForm({ description: "", target_scope: "country", target_county_id: "" }); setPhotoPath(""); setPhotoReset(value => value + 1);
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not post your search.");
    } finally { setBusy(false); }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-5 pb-10">
      <p className="feed-eyebrow">MEET SOMEONE NEW</p>
      <h1 className="text-2xl font-bold mb-2">Create a couple search</h1>
      <p className="text-sm text-brand-gray mb-5">Your search will be visible to everyone across Kenya. People who are interested can apply.</p>
      <form onSubmit={submit} className="couple-form">
        <div className="couple-form-match"><span className="couple-match-avatar">♡</span><div><strong>Open to connections</strong><p>Everyone can view this post and apply to meet you.</p></div></div>
        <label className="block text-sm font-semibold">About you and who you hope to meet
          <textarea className="input mt-1" rows={4} placeholder="Share a little about yourself and the kind of connection you want" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required maxLength={1000} />
        </label>
        <PhotoUploadField resetKey={photoReset} label="Add your required photo" onUploaded={path => setPhotoPath(path)} />
        {!photoPath && <p className="form-helper-error">Upload a photo before posting your couple search.</p>}
        <button className="btn-primary w-full" disabled={busy || !photoPath}>{busy ? "Posting…" : "Post my search"}</button>
        {msg && <p className="text-sm" role="status">{msg}</p>}
      </form>
    </main>
  );
}
