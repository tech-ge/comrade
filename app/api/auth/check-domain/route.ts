import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { email } = await req.json();
  const domain = String(email).split("@")[1]?.toLowerCase();
  if (!domain) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("universities")
    .select("id, name")
    .eq("email_domain", domain)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: "Use a valid school email (e.g., you@students.jkuat.ac.ke)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true, university: data });
}