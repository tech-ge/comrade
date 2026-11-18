import Link from "next/link";
import { LogoWordmark } from "@/components/brand/Logo";

export default function Landing() {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full animate-fade-in">
        <LogoWordmark size={36} />
        <div className="flex items-center gap-4">
          <Link href="/sponsor" className="text-sm font-semibold text-secondary hover:text-brand-green">Sponsor</Link>
          <Link href="/login" className="text-sm font-semibold text-brand-green">Log In</Link>
        </div>
      </header>

      <section className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center max-w-2xl mx-auto">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-green-soft text-brand-green text-xs font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-green" />
            Built for Kenyan universities
          </div>

          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            Support <span className="text-brand-green">Comrade</span>.
          </h1>

          <p className="text-secondary text-lg mb-8 max-w-md mx-auto">
            Gigs, help, advice, couples, and campus stories — one verified home for Kenyan university students.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-3 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          <Link href="/signup" className="btn-primary w-full block text-center">Create account</Link>
          <Link href="/login" className="btn-secondary w-full block text-center">Log in</Link>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-12 w-full max-w-md stagger">
          {[
            { label: "Gigs & Bids", desc: "Find work on campus" },
            { label: "Help & Advice", desc: "Support your school" },
            { label: "Find a Couple", desc: "Meet verified students" },
            { label: "Campus Posts", desc: "Stories & events" },
          ].map((f) => (
            <div key={f.label} className="card text-left">
              <div className="font-semibold text-sm">{f.label}</div>
              <div className="text-xs text-muted mt-0.5">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-muted border-t border-gray-200 max-w-6xl mx-auto w-full">
        <div className="flex items-center justify-center gap-4 mb-2">
          <Link href="/legal/terms">Terms</Link>
          <Link href="/legal/privacy">Privacy</Link>
          <Link href="/legal/rules">Rules</Link>
        </div>
        <div>© {new Date().getFullYear()} Comrade Hub Kenya · Made in Kenya</div>
      </footer>
    </main>
  );
}
