import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { randomBytes, scryptSync } from "crypto";

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function genSponsorCode(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `SP-${year}-${rand}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const { name, email, phone, organization, password } = body;
  if (!name || !email || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }
  if (String(password).length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: existing } = await admin.from("sponsor_accounts").select("id").eq("email", email).maybeSingle();
  if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

  const { data, error } = await admin.from("sponsor_accounts").insert({
    sponsor_code: genSponsorCode(),
    name,
    email,
    phone: phone || null,
    organization: organization || null,
    password_hash: hashPassword(password),
  }).select("sponsor_code, name, email").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const res = NextResponse.json({ ok: true, sponsor: data });
  res.cookies.set("sponsor_email", data.email, {
    httpOnly: true, secure: process.env.NODE_ENV === "production",
    sameSite: "lax", maxAge: 60 * 60 * 24 * 30, path: "/",
  });
  return res;
}
