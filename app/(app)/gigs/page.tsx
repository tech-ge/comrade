import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import PostAuthor from "@/components/posts/PostAuthor";

export const dynamic = "force-dynamic";

export default async function GigsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: gigs } = await sb
    .from("gigs")
    .select("id,user_id,title,description,scope,bid_limit,bid_count,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const authorIds = [...new Set((gigs || []).map(gig => gig.user_id))];
  const { data: authorRows } = authorIds.length ? await supabaseAdmin().from("users").select("id,full_name,first_name,username,public_id,profile_photo_url,deleted_at").in("id", authorIds) : { data: [] };
  const authors = new Map(await Promise.all((authorRows || []).map(async author => [author.id, { ...author, profile_photo: await resolvePhotoUrl(author.profile_photo_url) }] as const)));

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-bold">Gigs</h1>
        <Link href="/gigs/new" className="btn-primary text-sm px-3 py-2">Post Gig</Link>
      </div>
      {(gigs || []).length === 0 && <p className="text-brand-gray text-sm">No gigs yet.</p>}
      <ul className="space-y-3">
        {(gigs || []).map(g => (
          <li key={g.id} className="card">
            <PostAuthor author={authors.get(g.user_id) || {}} />
            <p className="text-xs text-brand-gray mb-1">{g.scope} · {g.bid_count}/{g.bid_limit} bids</p>
            <h2 className="font-semibold">{g.title}</h2>
            <p className="text-sm mt-1 whitespace-pre-wrap">{g.description}</p>
            <Link href={`/gigs/${g.id}`} className="text-brand-green text-sm mt-2 inline-block">View & Bid</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
