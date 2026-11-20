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
  const { data: reports } = await admin.from("reports").select("id,target_type,target_id,reporter_id,reason,created_at").order("created_at", { ascending: false }).limit(250);
  const keys = [...new Set((reports || []).map(row => `${row.target_type}:${row.target_id}`))];
  const grouped = new Map<string, typeof reports>();
  for (const report of reports || []) {
    const key = `${report.target_type}:${report.target_id}`;
    grouped.set(key, [...(grouped.get(key) || []), report]);
  }
  const reporterIds = [...new Set((reports || []).map(row => row.reporter_id))];
  const [{ data: reporters }, { data: allUsers }] = await Promise.all([
    reporterIds.length ? admin.from("users").select("id,full_name,role").in("id", reporterIds) : Promise.resolve({ data: [] }),
    admin.from("users").select("id,full_name,role").limit(1000),
  ]);
  const idsFor = (type: string) => [...new Set((reports || []).filter(row => row.target_type === type).map(row => row.target_id))];
  const [stories, helps, advice, gigs, couples, anonymous, comments] = await Promise.all([
    admin.from("stories").select("id,body,user_id,status").in("id", idsFor("story")),
    admin.from("help_posts").select("id,description,user_id,status").in("id", idsFor("help")),
    admin.from("advice_posts").select("id,what_happened,user_id").in("id", idsFor("advice")),
    admin.from("gigs").select("id,title,description,user_id,status").in("id", idsFor("gig")),
    admin.from("couple_posts").select("id,description,user_id,status").in("id", idsFor("couple")),
    admin.from("anonymous_posts").select("id,body,user_id,is_flagged").in("id", idsFor("anonymous")),
    admin.from("comments").select("id,body,user_id").in("id", idsFor("comment")),
  ]);
  const itemByKey = new Map<string, { body: string; user_id: string }>();
  for (const [type, rows] of [["story", stories.data], ["help", helps.data], ["advice", advice.data], ["gig", gigs.data], ["couple", couples.data], ["anonymous", anonymous.data], ["comment", comments.data]] as const) {
    for (const row of rows || []) {
      const record = row as { id: string; body?: string; description?: string; what_happened?: string; title?: string; user_id: string };
      itemByKey.set(`${type}:${record.id}`, { body: record.body || record.description || record.what_happened || record.title || "", user_id: record.user_id });
    }
  }
  return <main className="admin-page">
    <header className="admin-section-header"><div><p className="admin-eyebrow">COMMUNITY SAFETY</p><h1>Reports</h1><p className="admin-subtitle">Review the reported content, reporter count, and submitted notes before taking action.</p></div><span className="admin-result-count">{keys.length} reported items</span></header>
    {keys.length === 0 ? <p className="admin-empty">No reports.</p> : <div className="admin-record-list">{keys.map(key => {
      const rows = grouped.get(key) || [];
      const first = rows[0];
      if (!first) return null;
      const target = itemByKey.get(key);
      const reporterSet = new Set(rows.map(row => row.reporter_id));
      const reporterDetails = (reporters || []).filter(row => reporterSet.has(row.id));
      const reportedAuthor = target?.user_id ? (allUsers || []).find(person => person.id === target.user_id) : null;
      return <article className="admin-record admin-report-card" key={key}>
        <div><div className="admin-badges"><span className="admin-badge amber">{first.target_type}</span><span className="admin-badge rose">{reporterSet.size} reporters</span><span className="admin-badge neutral">{reporterDetails.filter(row => row.role === "admin").length} admins</span></div>
          <p className="admin-record-title">{target?.body || "Reported content unavailable"}</p><p className="admin-record-meta">Content by {reportedAuthor?.full_name || "member account"} · {new Date(first.created_at).toLocaleString()}</p>
          <details className="admin-post-detail"><summary>View reports and reporter notes</summary>{rows.map(row => <p className="admin-record-meta" key={row.id}>{reporterDetails.find(person => person.id === row.reporter_id)?.full_name || "Member"}{reporterDetails.find(person => person.id === row.reporter_id)?.role === "admin" ? " (admin)" : ""} · {row.reason} · {new Date(row.created_at).toLocaleString()}</p>)}</details>
        </div><div className="admin-record-actions"><AdminControl action="moderate_reported_content" id={first.target_id} value={first.target_type} label="Hide content" tone="danger" confirmText="Hide this reported item from members?" /><AdminControl action="dismiss_report" id={first.id} label="Dismiss report" tone="danger" confirmText="Dismiss this report?" /></div>
      </article>;
    })}</div>}
  </main>;
}
