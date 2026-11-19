import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminUsers() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: users } = await admin
    .from("users")
    .select("id, public_id, full_name, email, adm_number, role, verified, suspended, suspension_reason")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">PEOPLE & ACCESS</p><h1>Users</h1><p className="admin-subtitle">Review accounts, verification and permissions.</p></div><span className="admin-result-count">{users?.length || 0} shown</span></header>
      <div className="admin-record-list">
        {(users || []).map((item) => (
          <div className="admin-record" key={item.id}>
            <div className="admin-record-main"><div className="admin-avatar">{(item.full_name || "U").slice(0, 1).toUpperCase()}</div><div><p className="admin-record-title">{item.full_name || "Unnamed user"}</p><p className="admin-record-meta">{item.adm_number} · {item.email}</p><div className="admin-badges"><span className={`admin-badge ${item.role === "admin" ? "green" : "neutral"}`}>{item.role}</span><span className={`admin-badge ${item.verified ? "green" : "amber"}`}>{item.verified ? "Verified" : "Unverified"}</span><span className={`admin-badge ${item.suspended ? "rose" : "neutral"}`}>{item.suspended ? "Suspended" : "Active"}</span></div>{item.suspension_reason && <p className="admin-record-meta">Reason: {item.suspension_reason}</p>}</div></div>
            <div className="admin-record-actions">{item.suspended ? <AdminControl action="unsuspend_user" id={item.id} label="Restore access" /> : <AdminControl action="suspend_user" id={item.id} value="Suspended by admin" label="Suspend" tone="danger" confirmText={`Suspend ${item.full_name || "this user"}?`} />}{item.role === "admin" ? <AdminControl action="set_role" id={item.id} value="user" label="Remove admin" tone="danger" confirmText={`Remove admin access from ${item.full_name || "this user"}?`} /> : <AdminControl action="set_role" id={item.id} value="admin" label="Make admin" confirmText={`Give ${item.full_name || "this user"} admin access?`} />}</div>
          </div>
        ))}
      </div>
    </main>
  );
}
