"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import PhotoUploadField from "@/components/ui/PhotoUploadField";

export default function CoupleDetail() {
  const { id } = useParams<{ id: string }>();
  const [message, setMessage] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [status, setStatus] = useState("");

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/couple-applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ post_id: id, photo_path: photoPath || null, message }),
    });
    const data = await response.json();
    setStatus(response.ok ? "Application submitted." : data.error || "Failed");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-xl font-bold mb-3">Couple application</h1>
      <form onSubmit={apply} className="card space-y-3">
        <PhotoUploadField label="Add your photo (optional)" onUploaded={path => setPhotoPath(path)} />
        <textarea className="input" rows={5} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Introduce yourself" required />
        <button className="btn-primary w-full">Apply</button>
        {status && <p className="text-sm">{status}</p>}
      </form>
    </main>
  );
}
