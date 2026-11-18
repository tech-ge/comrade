import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const [{ count: users }, { count: reports }, { count: pendingWithdrawals }, { count: causes }] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("reports").select("id", { count: "exact", head: true }),
    admin.from("wallet_transactions").select("id", { count: "exact", head: true }).eq("type", "withdrawal").eq("status", "pending"),
    admin.from("causes").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  return (
    <main className="max-w-4xl mx-auto px-4 pt-6">
      <h1 className="text-3xl font-bold mb-6">Admin dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          ["Users", users || 0],
          ["Reports", reports || 0],
          ["Withdrawals", pendingWithdrawals || 0],
          ["Active causes", causes || 0],
        ].map(([label, value]) => (
          <div className="card" key={String(label)}>
            <p className="text-sm text-brand-gray">{label}</p>
            <p className="text-2xl font-bold">{String(value)}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
