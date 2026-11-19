import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { SuggestionReply } from "@/components/admin/AdminControl";

export const dynamic = "force-dynamic";

export default async function AdminSuggestions() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: suggestions } = await admin
    .from("suggestions")
    .select("id, body, admin_reply, replied_at, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">MEMBER FEEDBACK</p><h1>Suggestions</h1><p className="admin-subtitle">Respond to ideas and questions from the community.</p></div><span className="admin-result-count">{suggestions?.length || 0} messages</span></header>
      {(suggestions || []).length === 0 ? <p className="text-brand-gray">No suggestions.</p> : (
        <div className="admin-record-list">
          {suggestions?.map((suggestion) => (
            <div className="admin-record admin-suggestion" key={suggestion.id}>
              <div className="admin-suggestion-copy"><div className="admin-badges"><span className={`admin-badge ${suggestion.admin_reply ? "green" : "amber"}`}>{suggestion.admin_reply ? "Replied" : "Needs reply"}</span></div><p className="admin-record-title">{suggestion.body}</p><p className="admin-record-meta">Received {new Date(suggestion.created_at).toLocaleString()}</p></div>
              <SuggestionReply id={suggestion.id} initialValue={suggestion.admin_reply || ""} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
