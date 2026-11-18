import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email, otp } = await req.json();
  if (!email || !otp) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = supabaseAdmin();

  const { data, error } = await admin.auth.verifyOtp({
    email,
    token: String(otp),
    type: "email",
  });

  if (error || !data.user) {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 401 });
  }

  await admin.from("users").update({ verified: true }).eq("email", email);

  return NextResponse.json({ ok: true, user_id: data.user.id });
}
