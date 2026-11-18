import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { initializePaystack } from "@/lib/paystack/client";
import { randomUUID } from "crypto";
import { cookies } from "next/headers";

export async function POST(req: Request) {
  const body = await req.json();
  const { cause_id, amount_ksh, name } = body;
  if (!amount_ksh || amount_ksh < 10) return NextResponse.json({ error: "Minimum Ksh 10" }, { status: 400 });

  const admin = supabaseAdmin();
  const ref = `don_${randomUUID()}`;
  const paystackEmail = "geoffrey@gmail.com";

  let { data: guest } = await admin.from("sponsors_guest").select("id").eq("email", paystackEmail).maybeSingle();
  if (!guest) {
    const { data } = await admin.from("sponsors_guest").insert({ name: name || "Guest sponsor", email: paystackEmail }).select("id").single();
    guest = data;
  }

  // Sponsor account (if logged in)
  const sponsorEmail = cookies().get("sponsor_email")?.value;
  let sponsorAccountId: string | null = null;
  if (sponsorEmail) {
    const { data: sa } = await admin.from("sponsor_accounts").select("id").eq("email", sponsorEmail).maybeSingle();
    sponsorAccountId = sa?.id || null;
  }

  // Record pending donation
  const { error: insErr } = await admin.from("cause_donations").insert({
    sponsor_account_id: sponsorAccountId,
    guest_sponsor_id: sponsorAccountId ? null : (guest?.id ?? null),
    cause_id: cause_id || null,
    pool_donation: !cause_id,
    amount_ksh,
    paystack_ref: ref,
  });
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 400 });

  // Init Paystack
  const pay = await initializePaystack(Number(amount_ksh), ref);
  if (!pay.status) return NextResponse.json({ error: pay.message || "Paystack error" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    authorization_url: pay.data?.authorization_url,
    reference: ref,
  });
}
