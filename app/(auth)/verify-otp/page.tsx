"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function VerifyOtpPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  useEffect(() => {
    setEmail(new URLSearchParams(window.location.search).get("email") || "");
  }, []);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Invalid code"); return; }
    router.push("/profile/setup");
  }

  return (
    <main className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
      <p className="text-brand-gray mb-6">Enter the 6-digit code sent to {email}</p>
      <form onSubmit={verify} className="space-y-4">
        <input className="input text-center text-2xl tracking-widest" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,""))} required />
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Verifying..." : "Verify"}</button>
      </form>
    </main>
  );
}
