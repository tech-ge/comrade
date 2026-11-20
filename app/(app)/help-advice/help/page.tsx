import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SendHelpGift from "@/components/wallet/SendHelpGift";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: posts } = await sb.from("help_posts")
    .select("id, help_type, description, proof_url, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(30);
  const preparedPosts = await Promise.all((posts || []).map(async post => ({ ...post, photo: await resolvePhotoUrl(post.proof_url) })));

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <div className="flex gap-2 mb-4">
        <span className="px-3 py-1 rounded-full bg-brand-green text-white text-sm">Help</span>
        <Link href="/help-advice/advice" className="px-3 py-1 rounded-full bg-brand-gray-light text-sm">Advice</Link>
      </div>
      <h1 className="text-2xl font-bold mb-3">Help (your school)</h1>
      {(posts || []).length === 0 && <p className="text-brand-gray text-sm">No help posts yet.</p>}
      <ul className="space-y-3">
        {preparedPosts.map(p => (
          <li key={p.id} className="card">
            <p className="text-xs text-brand-gray mb-1">{p.help_type}</p>
            <p className="whitespace-pre-wrap">{p.description}</p>
            {p.photo && <img src={p.photo} alt="Help request attachment" loading="lazy" className="help-advice-image" />}
            <SendHelpGift postId={p.id} />
          </li>
        ))}
      </ul>
    </main>
  );
}
