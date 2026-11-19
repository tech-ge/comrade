"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

export default function ProfilePhotoEditor({ currentUrl, initials }: { currentUrl: string | null; initials: string }) {
  const [preview, setPreview] = useState(currentUrl || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setMessage("");
    const form = new FormData();
    form.append("photo", file);
    try {
      const uploadResponse = await fetch("/api/uploads/photo", { method: "POST", body: form });
      const uploaded = await uploadResponse.json();
      if (!uploadResponse.ok) throw new Error(uploaded.error || "Upload failed");
      const saveResponse = await fetch("/api/profile/photo", {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ photo_path: uploaded.path }),
      });
      const saved = await saveResponse.json();
      if (!saveResponse.ok) throw new Error(saved.error || "Could not save photo");
      setPreview(uploaded.url);
      setMessage("Profile photo updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="profile-photo-editor">
      {preview ? <img src={preview} alt="Profile" className="profile-avatar" /> : <span className="profile-avatar profile-avatar-initials">{initials}</span>}
      <label className="profile-photo-button">
        <Camera size={16} /> {busy ? "Uploading…" : "Change photo"}
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </label>
      {message && <span className="profile-photo-message" role="status">{message}</span>}
      <span className="profile-photo-hint">JPG, PNG, WebP or GIF · up to 5 MB</span>
    </div>
  );
}
