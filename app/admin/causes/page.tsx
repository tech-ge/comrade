import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl, CauseCreateForm } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminCauses() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: causes } = await admin
    .from("causes")
    .select("id, title, status, goal_ksh, raised_ksh, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">SPONSORSHIP</p><h1>Campus causes</h1><p className="admin-subtitle">Manage campaign visibility and follow fundraising progress.</p></div><span className="admin-result-count">{causes?.length || 0} causes</span></header>
      <CauseCreateForm />
      {(causes || []).length === 0 ? <p className="text-brand-gray">No causes.</p> : (
        <div className="admin-record-list">
          {causes?.map((cause) => (
            <div className="admin-record" key={cause.id}>
              <div className="admin-record-main"><span className="admin-stat-icon green"><span className="admin-type-mark">♥</span></span><div><div className="admin-badges"><span className={`admin-badge ${cause.status === "active" ? "green" : "neutral"}`}>{cause.status}</span></div><p className="admin-record-title">{cause.title}</p><p className="admin-record-meta">Ksh {Number(cause.raised_ksh).toLocaleString()} raised of Ksh {Number(cause.goal_ksh).toLocaleString()}</p><div className="admin-progress"><span style={{ width: `${Math.min(100, Number(cause.goal_ksh) > 0 ? Number(cause.raised_ksh) / Number(cause.goal_ksh) * 100 : 0)}%` }} /></div></div></div>
              <div className="admin-record-actions">{cause.status !== "active" && <AdminControl action="set_cause_status" id={cause.id} value="active" label="Activate" />} {cause.status !== "paused" && cause.status !== "closed" && <AdminControl action="set_cause_status" id={cause.id} value="paused" label="Pause" />} {cause.status !== "closed" && <AdminControl action="set_cause_status" id={cause.id} value="closed" label="Close" tone="danger" confirmText={`Close “${cause.title}”?`} />}</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
