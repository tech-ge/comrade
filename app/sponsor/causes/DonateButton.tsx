"use client";
import { useState } from "react";

export function DonateButton({ causeId, title }: { causeId: string; title: string }) {
  const [amount, setAmount] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function donate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg("");
    const res = await fetch("/api/sponsor/donate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cause_id: causeId, amount_ksh: Number(amount), name }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setMsg(data.error || "Failed"); return; }
    if (data.authorization_url) {
      window.location.href = data.authorization_url;
    } else {
      setMsg("Donation recorded.");
    }
  }

  if (!open) {
    return <button className="btn-primary w-full" onClick={() => setOpen(true)}>Donate to {title.slice(0, 30)}</button>;
  }

  return (
    <form onSubmit={donate} className="space-y-2 p-3 rounded-lg bg-brand-green-soft">
      <input className="input" type="number" min={10} placeholder="Amount (Ksh)" value={amount} onChange={e => setAmount(e.target.value)} required />
      <input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={loading}>{loading ? "…" : "Pay"}</button>
        <button type="button" className="btn-secondary" onClick={() => setOpen(false)}>Cancel</button>
      </div>
      {msg && <p className="text-xs text-brand-red">{msg}</p>}
    </form>
  );
}
