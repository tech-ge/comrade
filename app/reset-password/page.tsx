"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { error } = await sb.auth.updateUser({ password });
    setMessage(error ? error.message : "Password updated. You can now log in.");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Reset password</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" type="password" placeholder="New password" value={password} onChange={(event) => setPassword(event.target.value)} required />
        <input className="input" type="password" placeholder="Confirm password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
        <button className="btn-primary w-full">Update password</button>
        {message && <p className="text-sm">{message}</p>}
      </form>
    </main>
  );
}
