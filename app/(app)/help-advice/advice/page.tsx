import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import PostAuthor from "@/components/posts/PostAuthor";

export const dynamic = "force-dynamic";

export default async function AdvicePage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await sb.from("advice_posts")
    .select("id,user_id,what_happened,advice_needed,image_url,created_at")
    .order("created_at", { ascending: false })
    .limit(30);
  const preparedPosts = await Promise.all((posts || []).map(async post => ({ ...post, photo: await resolvePhotoUrl(post.image_url) })));
  const authorIds = [...new Set(preparedPosts.map(post => post.user_id))];
  const { data: authorRows } = authorIds.length ? await supabaseAdmin().from("users").select("id,full_name,first_name,username,public_id,profile_photo_url,deleted_at").in("id", authorIds) : { data: [] };
  const authors = new Map(await Promise.all((authorRows || []).map(async author => [author.id, { ...author, profile_photo: await resolvePhotoUrl(author.profile_photo_url) }] as const)));

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <div className="flex gap-2 mb-4">
        <Link href="/help-advice/help" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm">Help</Link>
        <span className="px-3 py-1 rounded-full bg-brand-green text-white text-sm">Advice</span>
      </div>
      <h1 className="text-2xl font-bold mb-3">Advice</h1>
      {(posts || []).length === 0 && <p className="text-brand-gray text-sm">No advice posts yet.</p>}
      <ul className="space-y-3">
        {preparedPosts.map(p => (
          <li key={p.id} className="card">
            <PostAuthor author={authors.get(p.user_id) || {}} />
            <p className="whitespace-pre-wrap">{p.what_happened}</p>
            <p className="text-sm text-brand-gray mt-2">Needs: {p.advice_needed}</p>
            {p.photo && <img src={p.photo} alt="Advice request attachment" loading="lazy" className="help-advice-image" />}
          </li>
        ))}
      </ul>
    </main>
  );
}
