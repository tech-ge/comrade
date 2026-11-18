import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const fd = await req.formData();
  const adm = String(fd.get("adm_number") || "").trim();
  const fullName = String(fd.get("full_name") || "").trim();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const selfie = fd.get("selfie") as File | null;

  if (!adm || !fullName || !email || !selfie) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const domain = email.split("@")[1];
  const admin = supabaseAdmin();

  const { data: uni } = await admin.from("universities").select("id").eq("email_domain", domain).maybeSingle();
  if (!uni) return NextResponse.json({ error: "Use a valid school email" }, { status: 400 });

  // Reject if ADM or email already used by a completed profile
  const { data: existingAdm } = await admin.from("users").select("id").eq("adm_number", adm).maybeSingle();
  if (existingAdm) return NextResponse.json({ error: "ADM number already registered" }, { status: 409 });

  const { data: existingEmail } = await admin.from("users").select("id").eq("email", email).maybeSingle();
  if (existingEmail) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  // Upload selfie to temporary location keyed by email
  const safeKey = email.replace(/[^a-z0-9]/gi, "_");
  const path = `pending/${safeKey}/selfie-${Date.now()}.jpg`;
  const { error: upErr } = await admin.storage.from("selfies").upload(path, selfie, { upsert: true, contentType: selfie.type });
  if (upErr) return NextResponse.json({ error: "Upload failed: " + upErr.message }, { status: 500 });

  // Send OTP (Supabase Auth)
  const { error: otpErr } = await admin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, data: { adm_number: adm, full_name: fullName, selfie_path: path } },
  });
  if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
