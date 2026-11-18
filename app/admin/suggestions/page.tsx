import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    <main className="max-w-4xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Suggestions</h1>
      {(suggestions || []).length === 0 ? <p className="text-brand-gray">No suggestions.</p> : (
        <div className="space-y-2">
          {suggestions?.map((suggestion) => (
            <div className="card" key={suggestion.id}>
              <p>{suggestion.body}</p>
              {suggestion.admin_reply && <p className="text-sm text-brand-green mt-2">Reply: {suggestion.admin_reply}</p>}
              <p className="text-xs text-brand-gray mt-1">{new Date(suggestion.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
