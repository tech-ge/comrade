"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [adm, setAdm] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function forgotPassword() {
    if (!adm) {
      setError("Enter your ADM number, then use forgot password.");
      return;
    }
    const lookup = await fetch("/api/auth/forgot-password-by-adm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adm_number: adm }),
    });
    setResetSent(lookup.ok);
    if (!lookup.ok) {
      const data = await lookup.json();
      setError(data.error || "Unable to send reset email");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adm_number: adm, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      router.replace("/posts");
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome back</h1>
      <p className="text-brand-gray mb-6">Log in with your ADM number</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">ADM Number</label>
          <input className="input mt-1" value={adm} onChange={e => setAdm(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input type="password" className="input mt-1" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "Logging in..." : "Log In"}</button>
      </form>
      <p className="mt-6 text-sm text-brand-gray">No account? <Link href="/signup">Sign up</Link></p>
      <button type="button" className="mt-3 text-sm text-brand-green" onClick={forgotPassword}>
        Forgot password
      </button>
      {resetSent && <p className="text-sm mt-2">Password reset email sent.</p>}
      <p className="mt-3 text-sm text-brand-gray border-t border-gray-200 pt-3">
        Want to sponsor students? <Link href="/sponsor" className="font-semibold text-brand-green">Sponsor page</Link>
      </p>
    </main>
  );
}
