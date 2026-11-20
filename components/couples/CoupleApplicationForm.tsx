"use client";

import { useEffect, useState } from "react";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

export default function CoupleApplicationForm({ postId }: { postId: string }) {
  const [message, setMessage] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [photoReset, setPhotoReset] = useState(0);
  useEffect(() => { void fetch("/api/couples", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId }) }); }, [postId]);
  async function apply(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/couple-applications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_id: postId, photo_path: photoPath || null, message }) });
      const data = await response.json();
      if (response.ok) { setStatus("Application submitted."); setMessage(""); setPhotoPath(""); setPhotoReset(value => value + 1); }
      else setStatus(data.error || "Could not apply.");
    } finally { setBusy(false); }
  }
  return <form onSubmit={apply} className="card space-y-3"><h2 className="font-bold">Interested? Apply to meet</h2><PhotoUploadField resetKey={photoReset} label="Add your photo (optional)" onUploaded={path => setPhotoPath(path)} /><textarea className="input" rows={5} value={message} onChange={event => setMessage(event.target.value)} placeholder="Introduce yourself" required maxLength={1000} /><button className="btn-primary w-full" disabled={busy}>{busy ? "Applying…" : "Apply"}</button>{status && <p className="text-sm" role="status">{status}</p>}</form>;
}
