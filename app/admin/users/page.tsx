import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { AdminControl } from "@/components/admin/AdminControl";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export const dynamic = "force-dynamic";

export default async function AdminUsers({ searchParams }: { searchParams?: { q?: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const query = (searchParams?.q || "").trim().slice(0, 80).replace(/[^a-zA-Z0-9@._\-\s]/g, "");
  let userQuery = admin
    .from("users")
    .select("id,public_id,username,first_name,full_name,email,adm_number,role,verified,suspended,read_only,suspension_reason,selfie_url,profile_photo_url,id_photo_url,phone,course,year_of_study,campus,created_at,deleted_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(500);
  if (query) userQuery = userQuery.or(`full_name.ilike.%${query}%,username.ilike.%${query}%,email.ilike.%${query}%,adm_number.ilike.%${query}%,public_id.ilike.%${query}%`);
  const { data: users, count } = await userQuery;
  const cards = await Promise.all((users || []).map(async item => ({ ...item, face: await resolvePhotoUrl(item.selfie_url || item.profile_photo_url) })));

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">PEOPLE & ACCESS</p><h1>Users</h1><p className="admin-subtitle">Search member records, verification, account status and permissions.</p></div><span className="admin-result-count">{count || 0} found · {users?.length || 0} shown</span></header>
      <form className="admin-user-search" role="search"><input className="input" type="search" name="q" defaultValue={query} maxLength={80} placeholder="Search name, email, ADM or member ID" /><button className="admin-action primary">Search users</button></form>
      <div className="admin-user-grid">
        {cards.map(item => (
          <article className="admin-user-card" key={item.id}>
            {item.face ? <img className="admin-user-selfie" src={item.face} alt={`${item.full_name || "Member"} selfie`} /> : <div className="admin-user-selfie admin-user-selfie-empty">{(item.full_name || "U").slice(0, 1).toUpperCase()}</div>}
            <div className="admin-user-card-body">
              <div className="admin-user-heading"><div><h2>{item.full_name || "Unnamed user"}</h2><p>{item.username ? `@${item.username}` : `Comrade ID ${item.public_id}`} · ADM {item.adm_number}</p></div>{item.deleted_at && <span className="admin-badge rose">Deleted</span>}</div>
              <div className="admin-badges"><span className={`admin-badge ${item.role === "admin" ? "green" : "neutral"}`}>{item.role}</span><span className={`admin-badge ${item.verified ? "green" : "amber"}`}>{item.verified ? "Verified" : "Unverified"}</span><span className={`admin-badge ${item.suspended ? "rose" : "neutral"}`}>{item.suspended ? "Suspended" : item.read_only ? "Read-only" : "Active"}</span></div>
              <details className="admin-user-details"><summary>View user details</summary><dl><div><dt>Email</dt><dd>{item.email}</dd></div><div><dt>Comrade ID</dt><dd>{item.public_id}</dd></div><div><dt>Phone</dt><dd>{item.phone}</dd></div><div><dt>Course</dt><dd>{item.course} · Year {item.year_of_study}</dd></div><div><dt>Campus</dt><dd>{item.campus}</dd></div><div><dt>Joined</dt><dd>{new Date(item.created_at).toLocaleDateString()}</dd></div></dl><a href={`/admin/content?q=${encodeURIComponent(item.public_id || item.full_name || "")}`}>Search this user’s content activity</a>{item.id_photo_url && <a href={item.id_photo_url} target="_blank" rel="noreferrer">View student ID photo</a>}{item.suspension_reason && <p>Account note: {item.suspension_reason}</p>}</details>
              <div className="admin-record-actions">{!item.deleted_at && (item.suspended ? <AdminControl action="unsuspend_user" id={item.id} label="Restore access" /> : item.read_only ? <AdminControl action="clear_read_only" id={item.id} label="Restore posting" /> : <AdminControl action="set_read_only" id={item.id} value="Read-only by admin" label="Set read-only" tone="danger" confirmText={`Stop ${item.full_name || "this user"} from posting and reacting while they can still browse?`} />)}{!item.deleted_at && item.id !== user.id && <AdminControl action="delete_user" id={item.id} label="Delete account" tone="danger" confirmText={`Delete ${item.full_name || "this account"}? Their login will be disabled, personal details will be removed, existing posts will show a deleted account label, and financial records will be retained for audit.`} />}{item.role === "admin" && !item.deleted_at ? <AdminControl action="set_role" id={item.id} value="user" label="Remove admin" tone="danger" confirmText={`Remove admin access from ${item.full_name || "this user"}?`} /> : !item.deleted_at && <AdminControl action="set_role" id={item.id} value="admin" label="Make admin" confirmText={`Give ${item.full_name || "this user"} admin access?`} />}</div>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
