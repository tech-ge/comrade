"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";

export default function SponsorLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/sponsor/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Login failed"); return; }
    router.push("/sponsor/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <Link href="/sponsor" className="block mb-8"><LogoWordmark size={32} /></Link>
      <h1 className="text-2xl font-bold mb-1">Sponsor login</h1>
      <p className="text-secondary text-sm mb-6">Welcome back. Your impact is waiting.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted text-center">
        New sponsor? <Link href="/sponsor/signup" className="font-semibold text-brand-green">Create account</Link>
      </p>
      <p className="mt-2 text-sm text-muted text-center">
        Just want to give? <Link href="/sponsor/causes" className="font-semibold text-brand-green">Donate directly</Link>
      </p>
    </main>
  );
}
