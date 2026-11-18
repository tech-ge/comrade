import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSchoolEmailDomain } from "@/lib/auth/school-email";

export async function POST(req: Request) {
  const fd = await req.formData();
  const adm = String(fd.get("adm_number") || "").trim();
  const fullName = String(fd.get("full_name") || "").trim();
  const email = String(fd.get("email") || "").trim().toLowerCase();
  const domain = getSchoolEmailDomain(email);
  const universityId = String(fd.get("university_id") || "").trim();
  const selfie = fd.get("selfie") as File | null;

  if (!adm || !fullName || !domain || !universityId || !selfie) {
    if (email && !domain) {
      return NextResponse.json(
        { error: "Enter a valid email address. Gmail, Yahoo, and Outlook addresses are not accepted." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "All fields, including university, are required" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data: uni, error: universityError } = await admin
    .from("universities").select("id").eq("id", universityId).maybeSingle();
  if (universityError) return NextResponse.json({ error: "Could not look up the selected university" }, { status: 500 });
  if (!uni) return NextResponse.json({ error: "Select a valid university" }, { status: 400 });

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
    options: {
      shouldCreateUser: true,
      data: { adm_number: adm, full_name: fullName, selfie_path: path, university_id: uni.id },
    },
  });
  if (otpErr) return NextResponse.json({ error: otpErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
