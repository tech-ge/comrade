import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { adm_number } = await req.json();
  if (!adm_number) return NextResponse.json({ error: "ADM number required" }, { status: 400 });

  const admin = supabaseAdmin();
  const { data: user } = await admin
    .from("users")
    .select("email")
    .eq("adm_number", String(adm_number))
    .maybeSingle();
  if (!user?.email) return NextResponse.json({ error: "ADM number not found" }, { status: 404 });

  const { error } = await admin.auth.resetPasswordForEmail(user.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
