"use client";
import { useState } from "react";
export default function NewCouplePost() {
  const [form, setForm] = useState({ description: "", poster_gender: "male", looking_for_gender: "female", target_scope: "country", target_county_id: "" });
  const [msg, setMsg] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/couples", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) setMsg("Posted! You'll see applicants soon.");
    else setMsg(data.error || "Failed");
  }
  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Post Search</h1>
      <form onSubmit={submit} className="space-y-3">
        <textarea className="input" placeholder="Describe what you're looking for" rows={4} value={form.description} onChange={e=>setForm({...form, description:e.target.value})} required />
        <select className="input" value={form.poster_gender} onChange={e=>setForm({...form, poster_gender:e.target.value})}>
          <option value="male">I am male</option>
          <option value="female">I am female</option>
        </select>
        <select className="input" value={form.looking_for_gender} onChange={e=>setForm({...form, looking_for_gender:e.target.value})}>
          <option value="female">Looking for female</option>
          <option value="male">Looking for male</option>
        </select>
        <select className="input" value={form.target_scope} onChange={e=>setForm({...form, target_scope:e.target.value})}>
          <option value="country">Whole Kenya</option>
          <option value="county">My County</option>
          <option value="school">My School</option>
        </select>
        <button className="btn-primary w-full">Post</button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
    </main>
  );
}
