import { redirect } from "next/navigation";
import Link from "next/link";
import { Activity, ArrowUpRight, CircleDollarSign, FileWarning, HeartHandshake, UsersRound } from "lucide-react";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role, first_name, full_name").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const [{ count: users }, { count: reports }, { count: pendingWithdrawals }, { count: causes }, { count: flagged }, { count: stories }, { count: gigs }, { count: help }] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("reports").select("id", { count: "exact", head: true }),
    admin.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending"),
    admin.from("causes").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("moderation_flags").select("id", { count: "exact", head: true }).is("reviewed_at", null),
    admin.from("stories").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("gigs").select("id", { count: "exact", head: true }).eq("status", "active"),
    admin.from("help_posts").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  const cards = [
    { label: "Community members", value: users || 0, icon: UsersRound, href: "/admin/users", tint: "green" },
    { label: "Open reports", value: reports || 0, icon: FileWarning, href: "/admin/reports", tint: "amber" },
    { label: "Needs moderation", value: flagged || 0, icon: Activity, href: "/admin/scan-queue", tint: "rose" },
    { label: "Pending withdrawals", value: pendingWithdrawals || 0, icon: CircleDollarSign, href: "/admin/transactions", tint: "blue" },
    { label: "Active content", value: (stories || 0) + (gigs || 0) + (help || 0), icon: Activity, href: "/admin/content", tint: "green" },
  ];

  return (
    <main className="admin-page">
      <header className="admin-page-header"><div><p className="admin-eyebrow">COMRADE HUB · ADMIN</p><h1>Good to see you, {profile.full_name?.split(" ")[0] || profile.first_name || "Admin"}</h1><p className="admin-subtitle">Here’s what needs your attention across the community.</p></div><span className="admin-live"><span /> Live overview</span></header>
      <section className="admin-stat-grid" aria-label="Platform overview">
        {cards.map(({ label, value, icon: Icon, href, tint }) => <Link className="admin-stat-card" href={href} key={label}><span className={`admin-stat-icon ${tint}`}><Icon size={20} /></span><span className="admin-stat-value">{value.toLocaleString()}</span><span className="admin-stat-label">{label}</span><ArrowUpRight size={16} className="admin-stat-arrow" /></Link>)}
      </section>
      <section className="admin-dashboard-grid">
        <div className="admin-panel"><div className="admin-panel-heading"><div><p className="admin-eyebrow">ADMIN WORKSPACE</p><h2>Manage the community</h2></div></div><div className="admin-module-grid">
          {[
            ["People & access", "Review members, account status and roles.", "/admin/users", UsersRound],
            ["Content library", "Edit, hide, restore, or remove member content.", "/admin/content", Activity],
            ["Reports", "Review member reports and follow up.", "/admin/reports", FileWarning],
            ["Moderation queue", "Review content flagged by the community.", "/admin/scan-queue", Activity],
            ["Transactions", "Review wallet activity and withdrawals.", "/admin/transactions", CircleDollarSign],
            ["Campus causes", `${causes || 0} active campaigns · manage campaign status.`, "/admin/causes", HeartHandshake],
            ["Suggestions", "Read feedback and reply to members.", "/admin/suggestions", ArrowUpRight],
          ].map(([title, desc, href, Icon]) => { const ModuleIcon = Icon as typeof UsersRound; return <Link className="admin-module" href={href as string} key={title as string}><span className="admin-module-icon"><ModuleIcon size={19} /></span><span><strong>{title as string}</strong><small>{desc as string}</small></span><ArrowUpRight size={16} className="admin-module-arrow" /></Link>; })}
        </div></div>
        <aside className="admin-panel admin-quick-panel"><p className="admin-eyebrow">QUICK ACCESS</p><h2>Keep operations moving</h2><p className="admin-subtitle">Jump straight to the queues that may need a decision.</p><Link href="/admin/scan-queue" className="admin-quick-link"><span className="admin-quick-icon rose"><Activity size={18} /></span><span><strong>Moderation queue</strong><small>{flagged || 0} awaiting review</small></span><ArrowUpRight size={16} /></Link><Link href="/admin/transactions" className="admin-quick-link"><span className="admin-quick-icon blue"><CircleDollarSign size={18} /></span><span><strong>Withdrawals</strong><small>{pendingWithdrawals || 0} pending approval</small></span><ArrowUpRight size={16} /></Link><Link href="/admin/causes" className="admin-quick-link"><span className="admin-quick-icon green"><HeartHandshake size={18} /></span><span><strong>Cause campaigns</strong><small>{causes || 0} active campaigns</small></span><ArrowUpRight size={16} /></Link></aside>
      </section>
    </main>
  );
}
