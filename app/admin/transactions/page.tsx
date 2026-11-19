import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminTransactions() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: transactions } = await admin
    .from("wallet_transactions")
    .select("id, type, amount_ksh, status, paystack_ref, withdrawal_details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">WALLET OPERATIONS</p><h1>Transactions</h1><p className="admin-subtitle">Review payment activity and process withdrawal requests.</p></div><span className="admin-result-count">{transactions?.length || 0} recent</span></header>
      <div className="admin-record-list">
        {(transactions || []).map((item) => (
          <div className="admin-record" key={item.id}>
            <div className="admin-record-main"><span className={`admin-stat-icon ${item.type === "withdrawal" ? "blue" : "green"}`}><span className="admin-currency-mark">KSh</span></span><div><div className="admin-badges"><span className="admin-badge neutral">{item.type.replace("_", " ")}</span><span className={`admin-badge ${item.status === "pending" ? "amber" : item.status === "success" ? "green" : "rose"}`}>{item.status}</span></div><p className="admin-record-title">Ksh {Number(item.amount_ksh).toLocaleString()}</p><p className="admin-record-meta">{item.paystack_ref || "No reference"} · {new Date(item.created_at).toLocaleString()}</p>
            {item.withdrawal_details && (
              <p className="admin-record-meta">
                {item.withdrawal_details.account_name} · {item.withdrawal_details.bank_name} · {item.withdrawal_details.account_number}
              </p>
            )}
            </div></div>
            {item.type === "withdrawal" && item.status === "pending" && <div className="admin-record-actions"><AdminControl action="approve_withdrawal" id={item.id} label="Approve" confirmText={`Approve withdrawal of Ksh ${Number(item.amount_ksh).toLocaleString()}?`} /><AdminControl action="reject_withdrawal" id={item.id} label="Reject" tone="danger" confirmText="Reject this withdrawal request?" /></div>}
          </div>
        ))}
      </div>
    </main>
  );
}
