import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

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
    .select("id, public_id, full_name, email, adm_number, role, verified, suspended")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-5xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <div className="space-y-2">
        {(users || []).map((item) => (
          <div className="card" key={item.id}>
            <p className="font-semibold">{item.full_name}</p>
            <p className="text-sm text-brand-gray">{item.adm_number} · {item.email}</p>
            <p className="text-xs mt-1">Role: {item.role} · {item.verified ? "Verified" : "Unverified"} · {item.suspended ? "Suspended" : "Active"}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
