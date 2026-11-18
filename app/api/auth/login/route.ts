import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  const { adm_number, password } = await req.json();
  if (!adm_number || !password) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: user, error } = await admin
    .from("users")
    .select("id, email, suspended, suspension_reason, role")
    .eq("adm_number", adm_number)
    .maybeSingle();

  if (error || !user) {
    return NextResponse.json({ error: "Invalid ADM number or password" }, { status: 401 });
  }

  if (user.suspended) {
    return NextResponse.json(
      { error: `Account suspended: ${user.suspension_reason || "contact admin"}` },
      { status: 403 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: authData, error: authErr } =
    await supabase.auth.signInWithPassword({ email: user.email, password });

  if (authErr || !authData.session) {
    return NextResponse.json({ error: "Invalid ADM number or password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("sb-access-token", authData.session.access_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: authData.session.expires_in,
    path: "/",
  });
  res.cookies.set("sb-refresh-token", authData.session.refresh_token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return res;
}