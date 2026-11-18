import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data, error } = await sb.from("gigs_public").select("*").eq("id", params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ data });
}
