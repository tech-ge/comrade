import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb
    .from("users")
    .select("public_id, first_name, full_name, course, year_of_study, campus, profile_photo_url, role")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-4">Profile</h1>
      <div className="card mb-3">
        <p className="text-sm text-brand-gray">Public ID</p>
        <p className="text-lg font-mono">{profile?.public_id || "000 000 000"}</p>
        <p className="mt-2 text-sm text-brand-gray">
          {profile?.full_name || profile?.first_name || "Student"} · {profile?.course || "Course"} · {profile?.year_of_study ? `Year ${profile.year_of_study}` : "Year"} · {profile?.campus || "Campus"}
        </p>
        {profile?.profile_photo_url && (
          <img src={profile.profile_photo_url} alt="" className="mt-3 w-24 h-24 rounded-full object-cover" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {profile?.role === "admin" && (
          <Link href="/admin/dashboard" className="card text-center py-4">Admin dashboard</Link>
        )}
        <Link href="/profile/wallet" className="card text-center py-4">Wallet</Link>
        <Link href="/profile/notifications" className="card text-center py-4">Notifications</Link>
        <Link href="/profile/suggestions" className="card text-center py-4">Suggestions</Link>
        <Link href="/legal/rules" className="card text-center py-4">Rules</Link>
      </div>
      <div className="mt-6 text-sm text-brand-gray space-x-3">
        <Link href="/legal/terms">Terms</Link>
        <Link href="/legal/privacy">Privacy</Link>
        <Link href="/legal/rules">Rules</Link>
      </div>
      <form action="/api/auth/logout" method="post" className="mt-6">
        <button className="btn-secondary w-full" type="submit">Log out</button>
      </form>
    </main>
  );
}
