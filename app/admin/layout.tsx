import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { AdminNavigation } from "@/components/admin/AdminNavigation";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  return <div className="admin-shell"><AdminNavigation /><div className="admin-main">{children}</div></div>;
}
