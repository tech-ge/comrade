import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    <main className="max-w-4xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Reports</h1>
      {(reports || []).length === 0 ? <p className="text-brand-gray">No reports.</p> : (
        <div className="space-y-2">
          {reports?.map((report) => (
            <div className="card" key={report.id}>
              <p className="font-semibold">{report.target_type} report</p>
              <p className="text-sm">{report.reason}</p>
              <p className="text-xs text-brand-gray mt-1">{new Date(report.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
