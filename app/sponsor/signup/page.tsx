"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";

export default function SponsorSignup() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", organization: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    setLoading(true);
    const res = await fetch("/api/sponsor/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Signup failed"); return; }
    router.push("/sponsor/dashboard");
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <Link href="/sponsor" className="block mb-8"><LogoWordmark size={32} /></Link>
      <h1 className="text-2xl font-bold mb-1">Create sponsor account</h1>
      <p className="text-secondary text-sm mb-6">Track donations and get impact reports.</p>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Full name</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Email</label>
          <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Phone (optional)</label>
          <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Organization (optional)</label>
          <input className="input" value={form.organization} onChange={e => setForm({ ...form, organization: e.target.value })} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Password</label>
          <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
          <p className="text-xs text-muted mt-1">At least 8 characters</p>
        </div>
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-muted text-center">
        Have an account? <Link href="/sponsor/login" className="font-semibold text-brand-green">Sign in</Link>
      </p>
    </main>
  );
}
