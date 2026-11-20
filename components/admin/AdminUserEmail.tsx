"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminUserEmail({ userId, email }: { userId: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function readResponse(response: Response): Promise<{ error?: string }> {
    const text = await response.text();
    try { return JSON.parse(text) as { error?: string }; }
    catch {
      throw new Error(`The email request returned an invalid server response (HTTP ${response.status}). Check the deployment logs and Resend email settings.`);
    }
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setStatus("");
    try {
      const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "email_user", id: userId, subject, message }) });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error || "Email could not be sent.");
      setSubject(""); setMessage(""); setStatus("Email sent."); setOpen(false); router.refresh();
    } catch (error) { setStatus(error instanceof Error ? error.message : "Email could not be sent."); }
    finally { setBusy(false); }
  }
  return <div className="admin-user-email"><button type="button" className="admin-action" disabled={!email} onClick={() => { setOpen(value => !value); setStatus(""); }}>{open ? "Close email" : "Email user"}</button>{open && <form onSubmit={submit}><p className="admin-record-meta">To: {email}</p><input className="input" value={subject} onChange={event => setSubject(event.target.value)} maxLength={160} placeholder="Subject" required /><textarea className="input" rows={4} value={message} onChange={event => setMessage(event.target.value)} maxLength={10000} placeholder="Write your email" required /><button className="admin-action primary" disabled={busy}>{busy ? "Sending…" : "Send email"}</button></form>}{status && <small role="status">{status}</small>}</div>;
}
