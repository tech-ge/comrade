import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminReports() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: reports } = await admin
    .from("reports")
    .select("id, target_type, target_id, reason, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">COMMUNITY SAFETY</p><h1>Reports</h1><p className="admin-subtitle">Recent reports submitted by community members.</p></div><span className="admin-result-count">{reports?.length || 0} reports</span></header>
      {(reports || []).length === 0 ? <p className="text-brand-gray">No reports.</p> : (
        <div className="admin-record-list">
          {reports?.map((report) => (
            <div className="admin-record" key={report.id}>
              <div className="admin-record-main"><span className="admin-stat-icon amber"><span className="admin-type-mark">!</span></span><div><div className="admin-badges"><span className="admin-badge amber">{report.target_type}</span></div><p className="admin-record-title">{report.reason}</p><p className="admin-record-meta">Submitted {new Date(report.created_at).toLocaleString()} · Content ID {report.target_id}</p></div></div>
              <div className="admin-record-actions"><AdminControl action="dismiss_report" id={report.id} label="Dismiss report" tone="danger" confirmText="Dismiss this report? It will be removed from the reports list." /></div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
