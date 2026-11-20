"use client";

import { useState } from "react";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

type County = { id: number; name: string };

export default function NewCoupleForm({ gender, counties, homeCountyId }: { gender: "male" | "female"; counties: County[]; homeCountyId: number | null }) {
  const lookingFor = gender === "male" ? "female" : "male";
  const [form, setForm] = useState({ description: "", target_scope: "school", target_county_id: homeCountyId ? String(homeCountyId) : "" });
  const [photoPath, setPhotoPath] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMsg("");
    try {
      const response = await fetch("/api/couples", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, looking_for_gender: lookingFor, target_county_id: form.target_scope === "county" ? Number(form.target_county_id) : null, photo_path: photoPath || null }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post your search.");
      setMsg("Your search is live and will only appear to matching viewers in your selected area.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not post your search.");
    } finally { setBusy(false); }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-5 pb-10">
      <p className="feed-eyebrow">MEET SOMEONE NEW</p>
      <h1 className="text-2xl font-bold mb-2">Create a couple search</h1>
      <p className="text-sm text-brand-gray mb-5">Your search is shown only to people of the other gender in the area you choose.</p>
      <form onSubmit={submit} className="couple-form">
        <div className="couple-form-match"><span className="couple-match-avatar">{gender === "male" ? "M" : "F"}</span><div><strong>{gender === "male" ? "Male" : "Female"} looking for {lookingFor === "male" ? "male" : "female"}</strong><p>Your gender comes from your verified profile. Same gender searches aren’t available.</p></div></div>
        <label className="block text-sm font-semibold">About you and who you hope to meet
          <textarea className="input mt-1" rows={4} placeholder="Share a little about yourself and the kind of connection you want" value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} required maxLength={1000} />
        </label>
        <PhotoUploadField label="Add a photo (optional)" onUploaded={path => setPhotoPath(path)} />
        <label className="block text-sm font-semibold">Who can see this search?
          <select className="input mt-1" value={form.target_scope} onChange={event => setForm({ ...form, target_scope: event.target.value })}>
            <option value="school">People at my school</option>
            <option value="county">People in a county</option>
            <option value="country">People across Kenya</option>
          </select>
        </label>
        {form.target_scope === "county" && <label className="block text-sm font-semibold">Choose county
          <select className="input mt-1" value={form.target_county_id} onChange={event => setForm({ ...form, target_county_id: event.target.value })} required>
            <option value="">Select a county</option>
            {counties.map(county => <option key={county.id} value={county.id}>{county.name}</option>)}
          </select>
        </label>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Posting…" : "Post my search"}</button>
        {msg && <p className="text-sm" role="status">{msg}</p>}
      </form>
    </main>
  );
}
