import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminScanQueue() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: flags } = await admin
    .from("moderation_flags")
    .select("id, target_type, target_id, report_count, flagged_at, reviewed_at")
    .order("flagged_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-4xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Scan queue</h1>
      {(flags || []).length === 0 ? <p className="text-brand-gray">No flagged content.</p> : (
        <div className="space-y-2">
          {flags?.map((flag) => (
            <div className="card" key={flag.id}>
              <p className="font-semibold">{flag.target_type} · {flag.report_count} reports</p>
              <p className="text-xs text-brand-gray">{new Date(flag.flagged_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
