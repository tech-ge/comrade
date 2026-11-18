import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { LogoWordmark } from "@/components/brand/Logo";
import { DonateButton } from "./DonateButton";

export const dynamic = "force-dynamic";

export default async function SponsorCauses() {
  const admin = supabaseAdmin();
  const { data: causes } = await admin
    .from("causes")
    .select("id, title, description, goal_ksh, raised_ksh, image_url, university_id, county_id")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen">
      <header className="px-6 py-5 max-w-5xl mx-auto w-full flex items-center justify-between">
        <Link href="/sponsor"><LogoWordmark size={32} /></Link>
        <Link href="/sponsor/login" className="text-sm font-semibold text-brand-green">Sign in</Link>
      </header>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <h1 className="text-3xl font-bold mb-2">Causes</h1>
        <p className="text-secondary mb-8">Choose a verified student cause. Every shilling is tracked.</p>

        {(causes || []).length === 0 && (
          <div className="card text-center py-12">
            <p className="text-secondary">No active causes right now. Check back soon.</p>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 stagger">
          {(causes || []).map((c) => {
            const pct = c.goal_ksh > 0 ? Math.min(100, Math.round((Number(c.raised_ksh) / Number(c.goal_ksh)) * 100)) : 0;
            return (
              <div key={c.id} className="card card-elevated">
                {c.image_url && (
                  <img src={c.image_url} alt="" loading="lazy" className="w-full h-40 object-cover rounded-lg mb-3" />
                )}
                <h2 className="font-bold text-lg mb-1">{c.title}</h2>
                <p className="text-sm text-secondary mb-4 line-clamp-3">{c.description}</p>

                <div className="mb-4">
                  <div className="flex justify-between text-xs text-muted mb-1">
                    <span>Ksh {Number(c.raised_ksh).toLocaleString()} raised</span>
                    <span>of Ksh {Number(c.goal_ksh).toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className="h-full bg-brand-green transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <DonateButton causeId={c.id} title={c.title} />
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
