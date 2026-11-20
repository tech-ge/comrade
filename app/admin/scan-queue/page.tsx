import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminScanQueue() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const [{ data: flags }, { data: withdrawals }] = await Promise.all([admin
    .from("moderation_flags")
    .select("id, target_type, target_id, report_count, flagged_at, reviewed_at")
    .order("flagged_at", { ascending: false })
    .limit(100), admin.from("wallet_transactions").select("id,wallet_id,amount_ksh,status,withdrawal_details,created_at").eq("type", "withdrawal").in("status", ["pending", "processing"]).order("created_at", { ascending: false }).limit(100)]);
  const walletIds = [...new Set((withdrawals || []).map(item => item.wallet_id))];
  const { data: wallets } = walletIds.length ? await admin.from("wallets").select("id,user_id").in("id", walletIds) : { data: [] };
  const memberIds = [...new Set((wallets || []).map(item => item.user_id))];
  const { data: members } = memberIds.length ? await admin.from("users").select("id,full_name,public_id").in("id", memberIds) : { data: [] };

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">COMMUNITY SAFETY</p><h1>Moderation queue</h1><p className="admin-subtitle">Review flagged posts and take action from here.</p></div><span className="admin-result-count">{flags?.filter(item => !item.reviewed_at).length || 0} awaiting review</span></header>
      {(flags || []).length === 0 ? <p className="admin-empty">No flagged content right now.</p> : (
        <div className="admin-record-list">
          {flags?.map((flag) => (
            <div className="admin-record" key={flag.id}>
              <div className="admin-record-main"><span className="admin-stat-icon rose"><span className="admin-type-mark">!</span></span><div><div className="admin-badges"><span className="admin-badge rose">{flag.target_type}</span><span className={`admin-badge ${flag.reviewed_at ? "neutral" : "amber"}`}>{flag.reviewed_at ? "Reviewed" : "Needs review"}</span></div><p className="admin-record-title">{flag.report_count} {flag.report_count === 1 ? "report" : "reports"}</p><p className="admin-record-meta">Content ID {flag.target_id} · Flagged {new Date(flag.flagged_at).toLocaleString()}</p></div></div>
              <div className="admin-record-actions">{!flag.reviewed_at && <AdminControl action="review_flag" id={flag.id} label="Mark reviewed" />}{["anonymous", "advice", "comment"].includes(flag.target_type) ? <AdminControl action="remove_flagged_content" id={flag.id} label="Remove content" tone="danger" confirmText="Permanently remove this flagged content? This cannot be undone." /> : <AdminControl action="hide_flagged_content" id={flag.id} label="Hide content" tone="danger" confirmText="Hide this flagged content from members?" />}</div>
            </div>
          ))}
        </div>
      )}
      <section className="admin-queue-withdrawals"><header className="admin-section-header"><div><p className="admin-eyebrow">WALLET OPERATIONS</p><h2>Withdrawals awaiting action</h2></div><a className="admin-action" href="/admin/transactions">All transactions</a></header>
        {(withdrawals || []).length === 0 ? <p className="admin-empty">No pending withdrawals.</p> : <div className="admin-record-list">{withdrawals?.map(item => { const memberId = wallets?.find(wallet => wallet.id === item.wallet_id)?.user_id; const member = members?.find(row => row.id === memberId); return <article className="admin-record" key={item.id}><div><span className={`admin-badge ${item.status === "pending" ? "amber" : "blue"}`}>{item.status}</span><p className="admin-record-title">Ksh {Number(item.amount_ksh).toLocaleString()}</p><p className="admin-record-meta">{member?.full_name || "Member"} · ID {member?.public_id || "—"} · {new Date(item.created_at).toLocaleString()}</p></div><div className="admin-record-actions"><a className="admin-action" href="/admin/transactions">Review withdrawal</a></div></article>; })}</div>}
      </section>
    </main>
  );
}
