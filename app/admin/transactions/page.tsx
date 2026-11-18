import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminTransactions() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const { data: transactions } = await admin
    .from("wallet_transactions")
    .select("id, type, amount_ksh, status, paystack_ref, withdrawal_details, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <main className="max-w-5xl mx-auto px-4 pt-6">
      <h1 className="text-2xl font-bold mb-4">Transactions</h1>
      <div className="space-y-2">
        {(transactions || []).map((item) => (
          <div className="card" key={item.id}>
            <p className="font-semibold capitalize">{item.type.replace("_", " ")} · Ksh {Number(item.amount_ksh).toLocaleString()}</p>
            <p className="text-sm">{item.status} · {item.paystack_ref || "No reference"}</p>
            {item.withdrawal_details && (
              <p className="text-xs text-brand-gray mt-1">
                {item.withdrawal_details.account_name} · {item.withdrawal_details.bank_name} · {item.withdrawal_details.account_number}
              </p>
            )}
            <p className="text-xs text-brand-gray">{new Date(item.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
