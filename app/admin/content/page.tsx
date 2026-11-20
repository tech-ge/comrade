import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminContentTools from "@/components/admin/AdminContentTools";

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const [stories, anonymous, help, advice, gigs, couples, comments] = await Promise.all([
    admin.from("stories").select("id,user_id,body,status,is_event,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("anonymous_posts").select("id,user_id,body,is_flagged,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("help_posts").select("id,user_id,help_type,description,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("advice_posts").select("id,user_id,what_happened,advice_needed,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("gigs").select("id,user_id,title,description,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("couple_posts").select("id,user_id,description,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("comments").select("id,user_id,body,created_at").order("created_at", { ascending: false }).limit(300),
  ]);

  const items = [
    ...(stories.data || []).map(row => ({ type: "story", id: row.id, userId: row.user_id, title: row.is_event ? "Event" : "Post", body: row.body, second: "", status: row.status === "active" ? "active" : ["deleted", "flagged"].includes(row.status) ? "hidden" : null, createdAt: row.created_at })),
    ...(anonymous.data || []).map(row => ({ type: "anonymous", id: row.id, userId: row.user_id, title: "Anonymous post", body: row.body, second: "", status: row.is_flagged ? "hidden" : "active", createdAt: row.created_at })),
    ...(help.data || []).map(row => ({ type: "help", id: row.id, userId: row.user_id, title: `Help · ${row.help_type}`, body: row.description, second: "", status: row.status === "active" ? "active" : "hidden", createdAt: row.created_at })),
    ...(advice.data || []).map(row => ({ type: "advice", id: row.id, userId: row.user_id, title: "Advice request", body: row.what_happened, second: row.advice_needed, status: null, createdAt: row.created_at })),
    ...(gigs.data || []).map(row => ({ type: "gig", id: row.id, userId: row.user_id, title: row.title, body: row.description, second: row.description, status: row.status === "active" ? "active" : "hidden", createdAt: row.created_at })),
    ...(couples.data || []).map(row => ({ type: "couple", id: row.id, userId: row.user_id, title: "Couple search", body: row.description, second: "", status: row.status === "active" ? "active" : row.status === "closed" ? "hidden" : null, createdAt: row.created_at })),
    ...(comments.data || []).map(row => ({ type: "comment", id: row.id, userId: row.user_id, title: "Comment", body: row.body, second: "", status: null, createdAt: row.created_at })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const userIds = [...new Set(items.map(item => item.userId))];
  const { data: authors } = userIds.length ? await admin.from("users").select("id,full_name,public_id").in("id", userIds) : { data: [] };
  const authorNames = new Map((authors || []).map(author => [author.id, { name: author.full_name, publicId: author.public_id }]));

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">PLATFORM CONTENT</p><h1>Content library</h1><p className="admin-subtitle">Browse, edit, hide, restore, or remove member posts across the platform.</p></div><span className="admin-result-count">{items.length} recent items</span></header>
      {items.length === 0 ? <p className="admin-empty">No member content yet.</p> : <div className="admin-record-list">
        {items.map(item => {
          const author = authorNames.get(item.userId);
          return <article className="admin-record admin-content-record" key={`${item.type}-${item.id}`}>
            <div className="admin-content-heading"><div><div className="admin-badges"><span className="admin-badge neutral">{item.type}</span>{item.status && <span className={`admin-badge ${item.status === "active" ? "green" : "amber"}`}>{item.status}</span>}</div><p className="admin-record-title">{item.title}</p><p className="admin-record-meta">{author?.name || "Unknown member"} · ID {author?.publicId || "—"} · {new Date(item.createdAt).toLocaleString()}</p></div></div>
            <p className="admin-content-preview">{item.body}{item.second && item.second !== item.body ? `\n\n${item.second}` : ""}</p>
            <AdminContentTools type={item.type} id={item.id} field1={item.type === "gig" ? item.title : item.body} field2={item.type === "advice" ? item.second : item.type === "gig" ? item.second : ""} status={item.status} />
          </article>;
        })}
      </div>}
    </main>
  );
}
