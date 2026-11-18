"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGigPage() {
  const router = useRouter();
  const [form, setForm] = useState({ title: "", description: "", scope: "school", bid_limit: "10", private_contact: "", private_links: "" });
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setLoading(false);
    if (res.ok) router.push("/gigs");
  }

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Post a Gig</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} required />
        <textarea className="input" placeholder="Description (public)" rows={4} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required />
        <select className="input" value={form.scope} onChange={e=>setForm({...form,scope:e.target.value})}>
          <option value="school">My School only</option>
          <option value="country">Whole Kenya</option>
        </select>
        <input className="input" type="number" placeholder="Bid limit (e.g., 10)" value={form.bid_limit} onChange={e=>setForm({...form,bid_limit:e.target.value})} />
        <input className="input" placeholder="Private contact (phone/email) — admin & bidders only" value={form.private_contact} onChange={e=>setForm({...form,private_contact:e.target.value})} required />
        <input className="input" placeholder="Private links (optional)" value={form.private_links} onChange={e=>setForm({...form,private_links:e.target.value})} />
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Posting..." : "Post Gig"}</button>
      </form>
    </main>
  );
}
