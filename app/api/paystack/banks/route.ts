import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return NextResponse.json({ error: "Paystack is not configured" }, { status: 503 });

  const response = await fetch("https://api.paystack.co/bank?currency=KES", {
    headers: { Authorization: `Bearer ${secret}` },
    next: { revalidate: 3600 },
  });
  const result = await response.json();
  if (!response.ok || !result.status) return NextResponse.json({ error: result.message || "Could not load banks" }, { status: 502 });
  return NextResponse.json({ banks: (result.data || []).map((bank: { name: string; code: string }) => ({ name: bank.name, code: bank.code })) });
}
