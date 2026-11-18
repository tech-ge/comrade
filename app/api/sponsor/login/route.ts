import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { scryptSync, timingSafeEqual } from "crypto";

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const computed = scryptSync(password, salt, 64);
    const expected = Buffer.from(hash, "hex");
    return computed.length === expected.length && timingSafeEqual(computed, expected);
  } catch { return false; }
}

export async function POST(req: Request) {
  const { email, password } = await req.json();
  if (!email || !password) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: sponsor } = await admin.from("sponsor_accounts").select("*").eq("email", email).maybeSingle();
  if (!sponsor) return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });

  if (!verifyPassword(password, sponsor.password_hash)) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sponsor_email", sponsor.email, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return res;
}
