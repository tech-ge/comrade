import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function PostsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await sb.from("users").select("university_id, home_county_id").eq("id", user.id).single();

  const { data: stories } = await sb
    .from("stories")
    .select("id, body, image_url, is_event, target_scope, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Posts</h1>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-brand-green text-white text-sm shrink-0">All</span>
        <Link href="/posts/events" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Events</Link>
        <Link href="/posts/stories" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Stories</Link>
        <Link href="/posts/anonymous" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Anonymous</Link>
        <Link href="/posts/matched" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm shrink-0">Matched</Link>
      </div>
      {(stories || []).length === 0 && (
        <p className="text-brand-gray text-sm">No posts yet. Be the first.</p>
      )}
      <ul className="space-y-3">
        {(stories || []).map(s => (
          <li key={s.id} className="card">
            <p className="text-xs text-brand-gray mb-1">
              {s.is_event ? "EVENT · " : ""}{s.target_scope} · {new Date(s.created_at).toLocaleDateString()}
            </p>
            <p className="whitespace-pre-wrap">{s.body}</p>
            {s.image_url && <img src={s.image_url} alt="" loading="lazy" className="mt-2 rounded" />}
          </li>
        ))}
      </ul>
    </main>
  );
}