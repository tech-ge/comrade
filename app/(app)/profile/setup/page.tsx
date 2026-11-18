"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProfileSetup() {
  const router = useRouter();
  const [form, setForm] = useState({
    first_name: "", full_name: "", adm_number: "", course: "",
    year_of_study: "", campus: "", gender: "", home_county_id: "", phone: "",
  });
  const [selfie, setSelfie] = useState<File | null>(null);
  const [idPhoto, setIdPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (selfie) fd.append("selfie", selfie);
    if (idPhoto) fd.append("id_photo", idPhoto);

    const res = await fetch("/api/profile/setup", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Failed"); return; }
    router.push("/posts");
  }

  return (
    <main className="max-w-md mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold mb-4">Complete your profile</h1>
      <form onSubmit={submit} className="space-y-3">
        <input className="input" placeholder="First name" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
        <input className="input" placeholder="Full name (as on ID)" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
        <input className="input" placeholder="ADM number" value={form.adm_number} onChange={e => setForm({ ...form, adm_number: e.target.value })} required />
        <input className="input" placeholder="Course" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} required />
        <input className="input" type="number" placeholder="Year of study" value={form.year_of_study} onChange={e => setForm({ ...form, year_of_study: e.target.value })} required />
        <input className="input" placeholder="Campus" value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })} required />
        <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} required>
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
        <select className="input" value={form.home_county_id} onChange={e => setForm({ ...form, home_county_id: e.target.value })} required>
          <option value="">Home county</option>
        </select>
        <input className="input" type="tel" placeholder="Phone (private)" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
        <label className="text-sm font-medium">Selfie (verification only)</label>
        <input type="file" accept="image/*" onChange={e => setSelfie(e.target.files?.[0] || null)} required />
        <label className="text-sm font-medium">Student ID photo</label>
        <input type="file" accept="image/*" onChange={e => setIdPhoto(e.target.files?.[0] || null)} required />
        {error && <p className="text-brand-red text-sm">{error}</p>}
        <button className="btn-primary w-full" disabled={loading}>{loading ? "Saving…" : "Finish Setup"}</button>
      </form>
    </main>
  );
}
