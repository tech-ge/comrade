import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";
import { Heart, ShieldCheck, Users, ArrowRight } from "lucide-react";

export default function SponsorLanding() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 max-w-6xl mx-auto w-full flex items-center justify-between">
        <Link href="/"><LogoWordmark size={36} /></Link>
        <Link href="/" className="text-sm font-semibold text-brand-green">Back to app</Link>
      </header>

      <section className="flex-1 max-w-4xl mx-auto w-full px-6 py-12">
        <div className="text-center mb-12 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-green-soft text-brand-green text-xs font-semibold mb-4">
            <Heart size={14} fill="currentColor" />
            Sponsorship
          </div>
          <h1 className="text-4xl font-extrabold mb-3">Support Kenyan Comrades.</h1>
          <p className="text-secondary text-lg max-w-lg mx-auto">
            Every shilling goes directly to verified students in need. Choose a cause, donate, and see your impact.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-12 stagger">
          {/* Guest donation */}
          <div className="card card-elevated">
            <div className="w-12 h-12 rounded-xl bg-brand-green-soft flex items-center justify-center mb-4">
              <Heart size={22} className="text-brand-green" />
            </div>
            <h2 className="text-xl font-bold mb-2">Donate Directly</h2>
            <p className="text-sm text-secondary mb-6">
              No account needed. Give any amount to a cause or to the general fund. Get an email receipt instantly.
            </p>
            <Link href="/sponsor/causes" className="btn-primary w-full block text-center">
              Donate now <ArrowRight size={16} className="inline ml-1" />
            </Link>
          </div>

          {/* Sponsor account */}
          <div className="card card-elevated">
            <div className="w-12 h-12 rounded-xl bg-brand-green-soft flex items-center justify-center mb-4">
              <ShieldCheck size={22} className="text-brand-green" />
            </div>
            <h2 className="text-xl font-bold mb-2">Sponsor Account</h2>
            <p className="text-sm text-secondary mb-6">
              Track your donations, download receipts, and get a monthly impact report. Ideal for organizations and regular givers.
            </p>
            <Link href="/sponsor/signup" className="btn-secondary w-full block text-center">
              Create account
            </Link>
          </div>
        </div>

        {/* Trust */}
        <div className="grid md:grid-cols-3 gap-4 text-center">
          {[
            { icon: ShieldCheck, title: "Verified students", desc: "Every recipient is ID-verified" },
            { icon: Users, title: "100% to students", desc: "Admin allocates only to real needs" },
            { icon: Heart, title: "Full transparency", desc: "See exactly where funds go" },
          ].map((t, i) => (
            <div key={i} className="p-4">
              <t.icon size={24} className="text-brand-green mx-auto mb-2" strokeWidth={1.7} />
              <div className="font-semibold text-sm">{t.title}</div>
              <div className="text-xs text-muted mt-1">{t.desc}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
