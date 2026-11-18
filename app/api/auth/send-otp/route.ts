import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email } = await req.json();
  const domain = String(email).split("@")[1]?.toLowerCase();
  if (!domain) return NextResponse.json({ error: "Invalid email" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: uni } = await admin.from("universities").select("id").eq("email_domain", domain).maybeSingle();
  if (!uni) return NextResponse.json({ error: "Invalid school email" }, { status: 400 });

  const { error } = await admin.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
