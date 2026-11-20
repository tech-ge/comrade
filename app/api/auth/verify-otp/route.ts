import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  let input: { email?: unknown; otp?: unknown };
  try { input = await req.json(); }
  catch { return NextResponse.json({ error: "Enter your email and 6-digit code." }, { status: 400 }); }
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const otp = typeof input.otp === "string" ? input.otp.trim() : "";
  if (!email || !/^\d{6}$/.test(otp)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Verify with the cookie-aware client so the new session is saved for
  // finish-signup, which requires an authenticated user.
  const sb = supabaseServer();
  const { data, error } = await sb.auth.verifyOtp({
    email,
    token: otp,
    type: "email",
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  const { error: profileError } = await supabaseAdmin().from("users").update({ verified: true }).eq("email", email);
  // A profile row is created at the end of signup, after OTP verification.
  // The no-row case is expected for a new account, so don't fail verification.
  if (profileError && profileError.code !== "PGRST116") {
    return NextResponse.json({ error: "Email verified, but profile status could not be updated." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, user_id: data.user.id });
}
