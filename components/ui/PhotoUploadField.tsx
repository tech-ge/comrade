"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { preparePhoto } from "@/lib/storage/prepare-photo";

export default function PhotoUploadField({ onUploaded, initialUrl, label = "Add a photo" }: {
  onUploaded: (path: string, url: string) => void;
  initialUrl?: string;
  label?: string;
}) {
  const [preview, setPreview] = useState(initialUrl || "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setMessage("");
    try {
      const photo = await preparePhoto(file);
      if (photo.size > 5 * 1024 * 1024) throw new Error("This image is still over 5 MB. Choose a smaller photo.");
      const form = new FormData(); form.append("photo", photo);
      const response = await fetch("/api/uploads/photo", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      setPreview(data.url); onUploaded(data.path, data.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed. Check your connection and try again.");
    } finally { setBusy(false); }
  }
  return (
    <div className="photo-upload-field">
      {preview && <img src={preview} alt="Selected upload" className="photo-upload-preview" />}
      <label className="photo-upload-button">
        <ImagePlus size={17} /> {busy ? "Uploading…" : label}
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/gif" disabled={busy} onChange={event => { void upload(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      </label>
      <span className="photo-upload-hint">JPG, PNG, WebP or GIF · up to 5 MB</span>
      {message && <span className="profile-photo-message" role="status">{message}</span>}
    </div>
  );
}
