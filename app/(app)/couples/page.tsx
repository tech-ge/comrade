import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CouplesPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: postRows } = await sb.from("couple_posts")
    .select("id, photo_url, description, poster_gender, looking_for_gender, target_scope, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const posts = await Promise.all((postRows || []).map(async post => ({ ...post, photo_url: await resolvePhotoUrl(post.photo_url) || "/placeholder-couple.png" })));

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Couples</h1>
        <Link href="/couples/new" className="btn-primary text-sm px-3 py-2">Post Search</Link>
      </div>
      {(posts || []).length === 0 && <p className="text-brand-gray text-sm">No active searches.</p>}
      <ul className="space-y-3">
        {(posts || []).map(p => (
          <li key={p.id} className="card">
            <img src={p.photo_url} alt="" loading="lazy" className="w-full h-48 object-cover rounded mb-2" />
            <p className="text-xs text-brand-gray mb-1">{p.poster_gender} → {p.looking_for_gender} · {p.target_scope}</p>
            <p className="whitespace-pre-wrap">{p.description}</p>
            <Link href={`/couples/${p.id}`} className="text-brand-green text-sm mt-2 inline-block">View</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
