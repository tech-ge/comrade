import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getSchoolEmailDomain } from "@/lib/auth/school-email";

export async function POST(req: Request) {
  const { email } = await req.json();
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const domain = getSchoolEmailDomain(normalizedEmail);
  if (!domain) {
    return NextResponse.json({ error: "Gmail, Yahoo, and Outlook addresses are not accepted." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { error } = await admin.auth.signInWithOtp({
    email: normalizedEmail,
    options: { shouldCreateUser: true },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
