"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function GigDetail() {
  const { id } = useParams<{ id: string }>();
  const [gig, setGig] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/gigs/${id}`).then(r => r.json()).then(d => setGig(d.data));
  }, [id]);

  async function bid() {
    setLoading(true); setMsg("");
    const res = await fetch("/api/gigs/bid", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gig_id: id }),
    });
    const data = await res.json();
    setLoading(false);
    setMsg(res.ok ? "Contact details sent to your messages." : data.error || "Failed");
  }

  if (!gig) return <main className="max-w-2xl mx-auto px-4 pt-4">Loading…</main>;

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-2">{gig.title}</h1>
      <p className="text-sm text-brand-gray mb-3">{gig.scope} · {gig.bid_count}/{gig.bid_limit} bids</p>
      <p className="whitespace-pre-wrap mb-4">{gig.description}</p>
      <button className="btn-primary w-full" onClick={bid} disabled={loading}>
        {loading ? "Sending…" : "Bid — get contact"}
      </button>
      {msg && <p className="text-sm mt-3">{msg}</p>}
    </main>
  );
}
