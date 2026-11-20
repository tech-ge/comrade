"use client";

import Link from "next/link";
import { useState } from "react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function requestCode(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not request a reset code.");
      setSent(true); setMessage("If an account uses this email, a six-digit code is on its way. Check your inbox.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not request a reset code."); }
    finally { setBusy(false); }
  }

  async function resetPassword(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (password !== confirmPassword) { setMessage("Passwords do not match."); return; }
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "verify", email, code, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reset password.");
      setMessage("Password updated. You can now log in."); setCode(""); setPassword(""); setConfirmPassword("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not reset password."); }
    finally { setBusy(false); }
  }

  return <main className="max-w-md mx-auto px-6 py-10"><h1 className="text-2xl font-bold mb-2">Forgot password?</h1><p className="text-brand-gray text-sm mb-5">We’ll email you a six-digit code to reset your account password.</p>
    {!sent ? <form className="space-y-3" onSubmit={requestCode}><label className="block text-sm font-medium">Account email<input className="input mt-1" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></label><button className="btn-primary w-full" disabled={busy}>{busy ? "Sending code…" : "Send reset code"}</button></form> : <form className="space-y-3" onSubmit={resetPassword}><p className="text-sm text-brand-gray">Enter the code sent to <strong>{email}</strong>. It expires after 10 minutes.</p><input className="input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} placeholder="6-digit email code" value={code} onChange={event => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} required /><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="New password" value={password} onChange={event => setPassword(event.target.value)} required /><input className="input" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Confirm new password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required /><button className="btn-primary w-full" disabled={busy}>{busy ? "Updating password…" : "Verify code and reset password"}</button><button type="button" className="btn-secondary w-full" disabled={busy} onClick={() => { setSent(false); setMessage(""); }}>Use another email</button></form>}
    {message && <p className="mt-3 text-sm" role="status">{message}</p>}<p className="mt-5 text-sm"><Link href="/login">Back to login</Link></p>
  </main>;
}
