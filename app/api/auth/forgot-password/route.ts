import { randomInt, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendPasswordResetCode } from "@/lib/resend/email";

function digest(code: string) {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("Password reset service is not configured.");
  return createHmac("sha256", secret).update(code).digest();
}

export async function POST(req: Request) {
  let input: { action?: unknown; adm_number?: unknown; code?: unknown; password?: unknown };
  try { input = await req.json(); } catch { return NextResponse.json({ error: "Enter your admission number." }, { status: 400 }); }
  const admNumber = typeof input.adm_number === "string" ? input.adm_number.trim() : "";
  if (!admNumber || admNumber.length > 100) return NextResponse.json({ error: "Enter a valid admission number." }, { status: 400 });
  const admin = supabaseAdmin();
  const { data: member } = await admin.from("users").select("id,email").eq("adm_number", admNumber).maybeSingle();
  const email = member?.email?.trim().toLowerCase() || "";
  if (input.action === "verify") {
    const code = typeof input.code === "string" ? input.code.trim() : "";
    const password = typeof input.password === "string" ? input.password : "";
    if (!member || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(code)) return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return NextResponse.json({ error: "Password must be between 8 and 128 characters." }, { status: 400 });
    const { data: reset } = await admin.from("password_reset_codes").select("id,code_hash,expires_at,attempts").eq("email", email).maybeSingle();
    if (!reset || new Date(reset.expires_at).getTime() < Date.now()) {
      if (reset) await admin.from("password_reset_codes").delete().eq("id", reset.id);
      return NextResponse.json({ error: "That code is invalid or expired. Request a new one." }, { status: 400 });
    }
    if (reset.attempts >= 5) return NextResponse.json({ error: "Too many attempts. Request a new code." }, { status: 429 });
    const actual = digest(code);
    const expected = Buffer.from(reset.code_hash, "hex");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      const attempts = reset.attempts + 1;
      await admin.from("password_reset_codes").update({ attempts }).eq("id", reset.id);
      return NextResponse.json({ error: attempts >= 5 ? "Too many attempts. Request a new code." : "That code is incorrect." }, { status: attempts >= 5 ? 429 : 400 });
    }
    const { error } = await admin.auth.admin.updateUserById(member.id, { password });
    if (error) return NextResponse.json({ error: "Could not update your password. Try again." }, { status: 400 });
    await admin.from("password_reset_codes").delete().eq("id", reset.id);
    return NextResponse.json({ ok: true });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) return NextResponse.json({ error: "Password reset email is temporarily unavailable. Contact support." }, { status: 503 });

  // Keep the response identical for admission numbers that do not exist.
  if (!member) return NextResponse.json({ ok: true });
  const { data: recent } = await admin.from("password_reset_codes").select("created_at").eq("email", email).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) return NextResponse.json({ ok: true });

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { error: clearError } = await admin.from("password_reset_codes").delete().eq("email", email);
  if (clearError) return NextResponse.json({ error: "Could not start password reset. Try again later." }, { status: 500 });
  const { error: insertError } = await admin.from("password_reset_codes").insert({ email, code_hash: digest(code).toString("hex"), expires_at: new Date(Date.now() + 10 * 60_000).toISOString(), attempts: 0 });
  if (insertError) return NextResponse.json({ error: "Could not start password reset. Try again later." }, { status: 500 });
  try {
    const sent = await sendPasswordResetCode(email, code);
    if (sent.error) throw new Error("Email service unavailable");
  } catch {
    await admin.from("password_reset_codes").delete().eq("email", email);
    return NextResponse.json({ error: "Could not send the reset code. Try again later." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
