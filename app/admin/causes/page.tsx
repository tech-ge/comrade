import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminCauses() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: causes } = await admin
    .from("causes")
    .select("id, title, status, goal_ksh, raised_ksh, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-4xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Causes</h1>
      {(causes || []).length === 0 ? <p className="text-brand-gray">No causes.</p> : (
        <div className="space-y-2">
          {causes?.map((cause) => (
            <div className="card" key={cause.id}>
              <p className="font-semibold">{cause.title}</p>
              <p className="text-sm">Ksh {Number(cause.raised_ksh).toLocaleString()} of Ksh {Number(cause.goal_ksh).toLocaleString()} · {cause.status}</p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
