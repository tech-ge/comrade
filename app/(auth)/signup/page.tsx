"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogoWordmark } from "@/components/brand/Logo";
import { Camera, Check } from "lucide-react";

type Step = 1 | 2 | 3;

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [counties, setCounties] = useState<Array<{ id: number; name: string }>>([]);
  useEffect(() => {
    fetch("/api/counties").then(r => r.json()).then(d => setCounties(d.data || [])).catch(() => {});
  }, []);

  // Step 1
  const [adm, setAdm] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [selfie, setSelfie] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string>("");

  // Step 2
  const [otp, setOtp] = useState("");

  // Step 3
  const [form, setForm] = useState({
    first_name: "", course: "", year_of_study: "", campus: "",
    gender: "", home_county_id: "", phone: "", password: "", confirm_password: "",
  });
  const [idPhoto, setIdPhoto] = useState<File | null>(null);

  function onSelfieChange(f: File | null) {
    setSelfie(f);
    if (f) {
      const url = URL.createObjectURL(f);
      setSelfiePreview(url);
    } else {
      setSelfiePreview("");
    }
  }

  // ---- Step 1: initiate ----
  async function step1(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!adm || !fullName || !email || !selfie) { setError("All fields are required"); return; }
    setLoading(true);
    const fd = new FormData();
    fd.append("adm_number", adm);
    fd.append("full_name", fullName);
    fd.append("email", email);
    fd.append("selfie", selfie);
    const res = await fetch("/api/auth/init-signup", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Signup failed"); return; }
    setStep(2);
  }

  // ---- Step 2: OTP ----
  async function step2(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Invalid code"); return; }
    setStep(3);
  }

  // ---- Step 3: finish ----
  async function step3(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) { setError("Passwords do not match"); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (!idPhoto) { setError("Student ID photo required"); return; }

    setLoading(true);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (k !== "confirm_password") fd.append(k, v); });
    fd.append("id_photo", idPhoto);
    fd.append("email", email);
    fd.append("adm_number", adm);
    fd.append("full_name", fullName);

    const res = await fetch("/api/auth/finish-signup", { method: "POST", body: fd });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || "Setup failed"); return; }
    router.push("/posts");
  }

  return (
    <main className="min-h-screen px-6 py-8 max-w-md mx-auto">
      <Link href="/" className="block mb-6"><LogoWordmark size={32} /></Link>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1 h-1.5 rounded-full transition-all" style={{
            background: s <= step ? "var(--brand-green)" : "var(--border)",
          }} />
        ))}
      </div>
      <p className="text-xs text-muted mb-4 font-medium uppercase tracking-wider">
        Step {step} of 3
      </p>

      {/* ---- STEP 1 ---- */}
      {step === 1 && (
        <>
          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-secondary text-sm mb-6">Start with your student identity.</p>

          <form onSubmit={step1} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">ADM Number</label>
              <input className="input" value={adm} onChange={e => setAdm(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Full name (as on ID)</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">School email</label>
              <input className="input" type="email" placeholder="you@students.jkuat.ac.ke" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Selfie (verification only)</label>
              <div className="flex items-center gap-3">
                <label className="btn-secondary flex-1 flex items-center justify-center gap-2 cursor-pointer">
                  <Camera size={18} />
                  {selfie ? "Change" : "Take / Upload"}
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={e => onSelfieChange(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                {selfiePreview && (
                  <img src={selfiePreview} alt="" className="w-14 h-14 rounded-lg object-cover border border-gray-200" />
                )}
              </div>
              <p className="text-xs text-muted mt-1">Used only to verify you match your student ID. Never shown publicly.</p>
            </div>
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Sending code…" : "Continue"}
            </button>
          </form>
        </>
      )}

      {/* ---- STEP 2 ---- */}
      {step === 2 && (
        <>
          <h1 className="text-2xl font-bold mb-1">Verify your email</h1>
          <p className="text-secondary text-sm mb-6">We sent a 6-digit code to <b>{email}</b></p>
          <form onSubmit={step2} className="space-y-4">
            <input
              className="input text-center text-2xl tracking-widest font-mono"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              required
              autoFocus
            />
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Verifying…" : "Verify"}
            </button>
            <button type="button" className="text-sm text-brand-green text-center w-full" onClick={async () => {
              await fetch("/api/auth/resend-otp", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              });
            }}>
              Didn't receive? Resend
            </button>
          </form>
        </>
      )}

      {/* ---- STEP 3 ---- */}
      {step === 3 && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-full bg-brand-green flex items-center justify-center">
              <Check size={14} className="text-white" strokeWidth={3} />
            </div>
            <span className="text-sm font-medium text-brand-green">Email verified</span>
          </div>
          <h1 className="text-2xl font-bold mb-1">Complete your profile</h1>
          <p className="text-secondary text-sm mb-6">These cannot be changed later.</p>

          <form onSubmit={step3} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">First name</label>
              <input className="input" value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Course</label>
              <input className="input" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Year</label>
                <input className="input" type="number" min={1} max={8} value={form.year_of_study} onChange={e => setForm({ ...form, year_of_study: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Campus</label>
                <input className="input" value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Gender</label>
              <select className="input" value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} required>
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Home county</label>
              <select className="input" value={form.home_county_id} onChange={e => setForm({ ...form, home_county_id: e.target.value })} required>
                <option value="">Select county</option>
                {counties.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone (private)</label>
              <input className="input" type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Student ID photo</label>
              <input type="file" accept="image/*" onChange={e => setIdPhoto(e.target.files?.[0] || null)} required className="input" />
              <p className="text-xs text-muted mt-1">Admin sees this to verify you. Never public.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Password</label>
              <input className="input" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Confirm password</label>
              <input className="input" type="password" value={form.confirm_password} onChange={e => setForm({ ...form, confirm_password: e.target.value })} required />
            </div>
            {error && <p className="text-brand-red text-sm">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>
              {loading ? "Finishing…" : "Finish signup"}
            </button>
          </form>
        </>
      )}

      {step === 1 && (
        <p className="mt-6 text-sm text-muted text-center">
          Have an account? <Link href="/login" className="font-semibold text-brand-green">Log in</Link>
        </p>
      )}
    </main>
  );
}
