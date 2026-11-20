"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminControl({ action, id, value, label, tone = "default", confirmText, contentType }: {
  action: string; id: string; value?: string; label: string; tone?: "default" | "danger"; confirmText?: string; contentType?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/action", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id, value, content_type: contentType, target_id: id }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Action failed");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally { setBusy(false); }
  }

  return <span className="admin-control-wrap"><button type="button" onClick={run} disabled={busy} className={`admin-action${tone === "danger" ? " danger" : ""}`}>{busy ? "Saving…" : label}</button>{error && <small className="admin-action-error">{error}</small>}</span>;
}

export function SuggestionReply({ id, initialValue = "" }: { id: string; initialValue?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reply_suggestion", id, value }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not save reply");
      setMessage("Reply saved"); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not save reply"); }
    finally { setBusy(false); }
  }
  return <form className="admin-reply-form" onSubmit={submit}><textarea className="input" rows={2} value={value} onChange={e => setValue(e.target.value)} placeholder="Write an admin reply" required /><div className="admin-reply-footer"><button className="admin-action primary" disabled={busy || !value.trim()}>{busy ? "Saving…" : "Save reply"}</button>{message && <small>{message}</small>}</div></form>;
}

export function CauseCreateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create_cause", title: form.get("title"), description: form.get("description"), goal_ksh: form.get("goal_ksh") }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not create campaign");
      formElement.reset(); setMessage("Campaign created"); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not create campaign"); }
    finally { setBusy(false); }
  }
  return <form className="admin-cause-form" onSubmit={submit}><div className="admin-cause-form-heading"><div><p className="admin-eyebrow">NEW CAMPAIGN</p><h2>Create a campus cause</h2></div></div><label>Campaign title<input className="input" name="title" maxLength={120} required placeholder="e.g. Emergency student support" /></label><label>What the campaign supports<textarea className="input" name="description" rows={3} maxLength={5000} required placeholder="Explain the need and how donations will help." /></label><label>Fundraising goal (Ksh)<input className="input" name="goal_ksh" type="number" min="1" step="1" required placeholder="50000" /></label><div className="admin-reply-footer"><button className="admin-action primary" disabled={busy}>{busy ? "Creating…" : "Create campaign"}</button>{message && <small>{message}</small>}</div></form>;
}

export function WithdrawalOtpForm({ id }: { id: string }) {
  const router = useRouter();
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "finalize_withdrawal", id, value: otp }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not approve transfer");
      setOtp(""); setMessage(data.message || "OTP accepted; waiting for Paystack transfer confirmation."); router.refresh();
    } catch (err) { setMessage(err instanceof Error ? err.message : "Could not approve transfer"); }
    finally { setBusy(false); }
  }
  return <form className="admin-otp-form" onSubmit={submit}><input className="input" inputMode="numeric" autoComplete="one-time-code" placeholder="Paystack OTP" value={otp} onChange={event => setOtp(event.target.value)} required /><button className="admin-action primary" disabled={busy}>{busy ? "Sending…" : "Submit OTP"}</button>{message && <small>{message}</small>}</form>;
}
