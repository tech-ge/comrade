import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { ArrowDownLeft, ArrowUpRight, Bell, BookOpen, ChevronRight, Heart, Lightbulb, LogOut, ShieldCheck, Wallet } from "lucide-react";
import ProfilePhotoEditor from "@/components/profile/ProfilePhotoEditor";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("users")
    .select("public_id, first_name, full_name, course, year_of_study, campus, profile_photo_url, role")
    .eq("id", user.id)
    .maybeSingle();

  const displayName = profile?.full_name || profile?.first_name || "Student";
  const initials = displayName.split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  const [{ data: wallet }, profilePhoto] = await Promise.all([
    supabaseAdmin().from("wallets").select("balance_ksh, reserved_ksh").eq("user_id", user.id).maybeSingle(),
    resolvePhotoUrl(profile?.profile_photo_url),
  ]);
  const availableBalance = Number(wallet?.balance_ksh || 0) - Number(wallet?.reserved_ksh || 0);

  return (
    <main className="profile-page mx-auto w-full max-w-3xl px-4 pb-10 pt-6">
      <header className="profile-hero">
        <ProfilePhotoEditor currentUrl={profilePhoto} initials={initials} />
        <div className="min-w-0 flex-1">
          <p className="profile-eyebrow">YOUR ACCOUNT</p>
          <h1 className="profile-name">{displayName}</h1>
          <p className="profile-subtitle">
            {[profile?.course, profile?.year_of_study ? `Year ${profile.year_of_study}` : null, profile?.campus].filter(Boolean).join(" · ") || "Complete your student profile"}
          </p>
          <p className="profile-public-id">Comrade ID <span>{profile?.public_id || "000 000 000"}</span></p>
        </div>
      </header>

      <section className="profile-section" aria-labelledby="wallet-heading">
        <div className="profile-section-heading">
          <div><p className="profile-eyebrow">MONEY & GIFTS</p><h2 id="wallet-heading">Your wallet</h2></div>
          <Link href="/profile/wallet" className="profile-text-link">Wallet details <ChevronRight size={16} /></Link>
        </div>
        <div className="profile-actions">
          <Link href="/profile/wallet" className="profile-action profile-action-featured">
            <span className="profile-action-icon"><Wallet size={19} /></span><span><strong>Wallet</strong><small>Ksh {availableBalance.toLocaleString()} available · activity</small></span><ChevronRight className="profile-action-chevron" size={18} />
          </Link>
          <Link href="/profile/wallet#deposit" className="profile-action">
            <span className="profile-action-icon"><ArrowDownLeft size={19} /></span><span><strong>Deposit</strong><small>Add money with Paystack</small></span><ChevronRight className="profile-action-chevron" size={18} />
          </Link>
          <Link href="/profile/wallet#withdraw" className="profile-action">
            <span className="profile-action-icon"><ArrowUpRight size={19} /></span><span><strong>Withdraw</strong><small>Request an M-Pesa or bank payout</small></span><ChevronRight className="profile-action-chevron" size={18} />
          </Link>
          <Link href="/help-advice/help" className="profile-action">
            <span className="profile-action-icon"><Heart size={19} /></span><span><strong>Send a gift</strong><small>Support a student asking for help</small></span><ChevronRight className="profile-action-chevron" size={18} />
          </Link>
        </div>
        <p className="profile-note">Choose a gift on any active help request. Your available wallet balance is used.</p>
      </section>

      <section className="profile-section" aria-labelledby="account-heading">
        <div className="profile-section-heading"><div><p className="profile-eyebrow">ACCOUNT</p><h2 id="account-heading">More for you</h2></div></div>
        <div className="profile-actions profile-actions-compact">
          {profile?.role === "admin" && <Link href="/admin/dashboard" className="profile-action"><span className="profile-action-icon"><ShieldCheck size={19} /></span><span><strong>Admin dashboard</strong><small>Manage the community</small></span><ChevronRight className="profile-action-chevron" size={18} /></Link>}
          <Link href="/profile/notifications" className="profile-action"><span className="profile-action-icon"><Bell size={19} /></span><span><strong>Notifications</strong><small>Updates and account messages</small></span><ChevronRight className="profile-action-chevron" size={18} /></Link>
          <Link href="/profile/suggestions" className="profile-action"><span className="profile-action-icon"><Lightbulb size={19} /></span><span><strong>Suggestions</strong><small>Share feedback with the team</small></span><ChevronRight className="profile-action-chevron" size={18} /></Link>
          <Link href="/legal/rules" className="profile-action"><span className="profile-action-icon"><BookOpen size={19} /></span><span><strong>Community rules</strong><small>Help keep campus welcoming</small></span><ChevronRight className="profile-action-chevron" size={18} /></Link>
        </div>
      </section>

      <nav className="profile-legal-links" aria-label="Legal information">
        <Link href="/legal/terms">Terms</Link><Link href="/legal/privacy">Privacy</Link><Link href="/legal/rules">Rules</Link>
      </nav>
      <form action="/api/auth/logout" method="post" className="profile-logout-form">
        <button className="profile-logout" type="submit"><LogOut size={17} /> Log out</button>
      </form>
    </main>
  );
}
