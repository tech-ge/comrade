import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { supabaseServer } from "@/lib/supabase/server";

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

  const supabase = supabaseServer();
  const { error: authErr } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (authErr) {
    return NextResponse.json({ error: "Invalid ADM number or password" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}