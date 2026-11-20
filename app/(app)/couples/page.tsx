import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import PostAuthor from "@/components/posts/PostAuthor";

export const dynamic = "force-dynamic";

export default async function CouplesPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: postRows } = await sb.from("couple_posts")
    .select("id,user_id,photo_url,description,poster_gender,looking_for_gender,target_scope,target_county_id,created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);
  const posts = await Promise.all((postRows || []).map(async post => ({ ...post, photo_url: await resolvePhotoUrl(post.photo_url) || "/placeholder-couple.png" })));
  const { data: myPostRows } = await supabaseAdmin().from("couple_posts").select("id,user_id,description").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false });
  const myPosts = myPostRows || [];
  const myPostIds = myPosts.map(post => post.id);
  const admin = supabaseAdmin();
  const [{ data: applications }, { data: views }] = myPostIds.length ? await Promise.all([
    admin.from("couple_applications").select("post_id").in("post_id", myPostIds),
    admin.from("couple_post_views").select("post_id").in("post_id", myPostIds),
  ]) : [{ data: [] }, { data: [] }];
  const authorIds = [...new Set(posts.map(post => post.user_id))];
  const { data: authorRows } = authorIds.length ? await supabaseAdmin().from("users").select("id,full_name,first_name,username,public_id,profile_photo_url,deleted_at").in("id", authorIds) : { data: [] };
  const authors = new Map(await Promise.all((authorRows || []).map(async author => [author.id, { ...author, profile_photo: await resolvePhotoUrl(author.profile_photo_url) }] as const)));
  const countyIds = [...new Set(posts.map(post => post.target_county_id).filter((id): id is number => Boolean(id)))];
  const { data: countyRows } = countyIds.length ? await supabaseAdmin().from("counties").select("id, name").in("id", countyIds) : { data: [] };
  const countyNames = new Map((countyRows || []).map(county => [county.id, county.name]));

  return (
    <main className="couples-page">
      <header className="couples-header">
        <div className="couples-title-line"><span aria-hidden="true">🌸</span><div><p className="feed-eyebrow">CAMPUS CONNECTIONS</p><h1>Find your person</h1></div><span aria-hidden="true">🌷</span></div>
        <p>Browse public connection posts from across Kenya. If someone interests you, open their post to apply.</p>
        <Link href="/couples/new" className="couples-create-link">＋ Create a search</Link>
      </header>
      {myPosts.length > 0 && <section className="couple-owner-stats"><h2>Your posts</h2>{myPosts.map(post => <article key={post.id}><p>{post.description}</p><span>{(views || []).filter(item => item.post_id === post.id).length} views</span><span>{(applications || []).filter(item => item.post_id === post.id).length} interested</span><Link href={`/couples/${post.id}`}>View details</Link></article>)}</section>}
      {(posts || []).length === 0 && <div className="couples-empty"><span>🌼</span><p>No matching searches yet.</p><small>Try checking again later or create your own search.</small></div>}
      <ul className="couple-card-grid">
        {(posts || []).map(p => (
          <li key={p.id} className="couple-social-card">
            <div className="couple-photo-wrap">
              {p.photo_url === "/placeholder-couple.png" ? <div className="couple-photo-placeholder"><span aria-hidden="true">🌷 🌼 🌸</span><strong>A new connection could start here</strong></div> : <img src={p.photo_url} alt="Couple search profile" loading="lazy" className="couple-photo" />}
              <span className="couple-flower couple-flower-one" aria-hidden="true">🌸</span><span className="couple-flower couple-flower-two" aria-hidden="true">🌺</span>
              <span className="couple-scope">{p.target_scope === "country" ? "Across Kenya" : p.target_scope === "county" ? (p.target_county_id ? countyNames.get(p.target_county_id) : null) || "County search" : "Same school"}</span>
            </div>
            <div className="couple-card-content">
              <PostAuthor author={authors.get(p.user_id) || {}} />
              <p className="couple-match-line"><span>♡</span> Open to meeting someone</p>
              <p className="couple-description clamped">{p.description}</p>
              {p.description.length > 120 && <Link href={`/couples/${p.id}`} className="couple-view-link">Read more <span>→</span></Link>}
              <Link href={`/couples/${p.id}`} className="couple-interested-link">♡ Interested — apply</Link>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
