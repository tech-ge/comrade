import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LogoWordmark } from "@/components/brand/Logo";
import { Heart, Receipt, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SponsorDashboard() {
  const email = cookies().get("sponsor_email")?.value;
  if (!email) redirect("/sponsor/login");

  const admin = supabaseAdmin();
  const { data: sponsor } = await admin.from("sponsor_accounts").select("*").eq("email", email).maybeSingle();
  if (!sponsor) redirect("/sponsor/login");

  const { data: donations } = await admin
    .from("cause_donations")
    .select("id, amount_ksh, paystack_ref, created_at, cause_id")
    .eq("sponsor_account_id", sponsor.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const total = (donations || []).reduce((s, d) => s + Number(d.amount_ksh), 0);

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link href="/sponsor"><LogoWordmark size={32} /></Link>
        <span className="text-sm text-muted">{sponsor.sponsor_code}</span>
      </header>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h1 className="text-3xl font-bold mb-1">Welcome, {sponsor.name.split(" ")[0]}</h1>
        <p className="text-secondary mb-8">Your impact at a glance.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8 stagger">
          <div className="card">
            <Heart size={20} className="text-brand-green mb-2" />
            <p className="text-sm text-muted">Total donated</p>
            <p className="text-2xl font-bold">Ksh {total.toLocaleString()}</p>
          </div>
          <div className="card">
            <Receipt size={20} className="text-brand-green mb-2" />
            <p className="text-sm text-muted">Donations</p>
            <p className="text-2xl font-bold">{donations?.length || 0}</p>
          </div>
          <div className="card">
            <TrendingUp size={20} className="text-brand-green mb-2" />
            <p className="text-sm text-muted">Cause</p>
            <p className="text-sm font-semibold mt-1">General fund</p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Recent donations</h2>
          <Link href="/sponsor/causes" className="btn-primary text-sm px-3 py-2">Donate again</Link>
        </div>

        {(donations || []).length === 0 ? (
          <div className="card text-center py-8">
            <p className="text-secondary mb-4">No donations yet.</p>
            <Link href="/sponsor/causes" className="btn-primary">Make your first donation</Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {donations!.map((d) => (
              <li key={d.id} className="card flex items-center justify-between">
                <div>
                  <p className="font-semibold">Ksh {Number(d.amount_ksh).toLocaleString()}</p>
                  <p className="text-xs text-muted">{new Date(d.created_at).toLocaleString()}</p>
                </div>
                <span className="text-xs text-brand-green font-medium">{d.paystack_ref ? "Paid" : "Pending"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
