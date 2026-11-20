import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import AdminContentTools from "@/components/admin/AdminContentTools";
import { AdminControl } from "@/components/admin/AdminControl";
import { resolvePhotoUrl } from "@/lib/storage/photo";

export const dynamic = "force-dynamic";

export default async function AdminContentPage({ searchParams }: { searchParams?: { type?: string; q?: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await sb.from("users").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin") redirect("/posts");

  const admin = supabaseAdmin();
  const [stories, anonymous, help, advice, gigs, couples, comments] = await Promise.all([
    admin.from("stories").select("id,user_id,body,image_url,status,is_event,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("anonymous_posts").select("id,user_id,body,is_flagged,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("help_posts").select("id,user_id,help_type,description,proof_url,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("advice_posts").select("id,user_id,what_happened,advice_needed,image_url,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("gigs").select("id,user_id,title,description,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("couple_posts").select("id,user_id,description,photo_url,status,created_at").order("created_at", { ascending: false }).limit(300),
    admin.from("comments").select("id,user_id,story_id,parent_comment_id,body,image_url,created_at").order("created_at", { ascending: false }).limit(500),
  ]);
  const storyIds = (stories.data || []).map(row => row.id);
  const { data: reactions } = storyIds.length ? await admin.from("story_reactions").select("story_id,type").in("story_id", storyIds) : { data: [] };
  const itemImages = new Map<string, string | null>(await Promise.all([
    ...(stories.data || []).map(async row => [`story-${row.id}`, await resolvePhotoUrl(row.image_url)] as const),
    ...(help.data || []).map(async row => [`help-${row.id}`, await resolvePhotoUrl(row.proof_url)] as const),
    ...(advice.data || []).map(async row => [`advice-${row.id}`, await resolvePhotoUrl(row.image_url)] as const),
    ...(couples.data || []).map(async row => [`couple-${row.id}`, row.photo_url?.startsWith("/") ? row.photo_url : await resolvePhotoUrl(row.photo_url)] as const),
  ]));

  const items = [
    ...(stories.data || []).map(row => ({ type: "story", id: row.id, userId: row.user_id, title: row.is_event ? "Event" : "Post", body: row.body, second: "", status: row.status === "active" ? "active" : ["deleted", "flagged"].includes(row.status) ? "hidden" : null, createdAt: row.created_at })),
    ...(anonymous.data || []).map(row => ({ type: "anonymous", id: row.id, userId: row.user_id, title: "Anonymous post", body: row.body, second: "", status: row.is_flagged ? "hidden" : "active", createdAt: row.created_at })),
    ...(help.data || []).map(row => ({ type: "help", id: row.id, userId: row.user_id, title: `Help · ${row.help_type}`, body: row.description, second: "", status: row.status === "active" ? "active" : "hidden", createdAt: row.created_at })),
    ...(advice.data || []).map(row => ({ type: "advice", id: row.id, userId: row.user_id, title: "Advice request", body: row.what_happened, second: row.advice_needed, status: null, createdAt: row.created_at })),
    ...(gigs.data || []).map(row => ({ type: "gig", id: row.id, userId: row.user_id, title: row.title, body: row.description, second: row.description, status: row.status === "active" ? "active" : "hidden", createdAt: row.created_at })),
    ...(couples.data || []).map(row => ({ type: "couple", id: row.id, userId: row.user_id, title: "Couple search", body: row.description, second: "", status: row.status === "active" ? "active" : row.status === "closed" ? "hidden" : null, createdAt: row.created_at })),
    ...(comments.data || []).map(row => ({ type: "comment", id: row.id, userId: row.user_id, title: "Comment", body: row.body, second: "", status: null, createdAt: row.created_at })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const userIds = [...new Set(items.map(item => item.userId))];
  const { data: authors } = userIds.length ? await admin.from("users").select("id,full_name,public_id,username,profile_photo_url").in("id", userIds) : { data: [] };
  const authorNames = new Map(await Promise.all((authors || []).map(async author => [author.id, { name: author.username ? `@${author.username}` : author.full_name, publicId: author.public_id, photo: await resolvePhotoUrl(author.profile_photo_url) }] as const)));
  const commentImages = new Map(await Promise.all((comments.data || []).filter(comment => comment.image_url).map(async comment => [comment.id, await resolvePhotoUrl(comment.image_url)] as const)));
  const needle = (searchParams?.q || "").trim().toLowerCase();
  const visibleItems = items.filter(item => (!searchParams?.type || searchParams.type === "all" || item.type === searchParams.type) && (!needle || `${item.title} ${item.body} ${authorNames.get(item.userId)?.name} ${authorNames.get(item.userId)?.publicId}`.toLowerCase().includes(needle)));
  const safeQuery = (searchParams?.q || "").trim().slice(0, 80).replace(/[^a-zA-Z0-9@._\-\s]/g, "");
  const { data: matchedUsers } = safeQuery ? await admin.from("users").select("id,full_name,public_id,username,email").or(`full_name.ilike.%${safeQuery}%,username.ilike.%${safeQuery}%,email.ilike.%${safeQuery}%,public_id.ilike.%${safeQuery}%`).limit(20) : { data: [] };
  const matchedIds = (matchedUsers || []).map(person => person.id);
  let activity: { userId: string; kind: string; body: string; created_at: string }[] = [];
  if (matchedIds.length) {
    const [{ data: memberStories }, { data: memberComments }, { data: memberReactions }, { data: memberBids }, { data: memberApplications }, { data: memberWallets }] = await Promise.all([
      admin.from("stories").select("user_id,body,created_at").in("user_id", matchedIds),
      admin.from("comments").select("user_id,body,created_at").in("user_id", matchedIds),
      admin.from("story_reactions").select("user_id,type,created_at").in("user_id", matchedIds),
      admin.from("gig_bids").select("bidder_id,created_at").in("bidder_id", matchedIds),
      admin.from("couple_applications").select("applicant_id,message,created_at").in("applicant_id", matchedIds),
      admin.from("wallets").select("id,user_id").in("user_id", matchedIds),
    ]);
    const walletIds = (memberWallets || []).map(wallet => wallet.id);
    const { data: transactions } = walletIds.length ? await admin.from("wallet_transactions").select("wallet_id,type,amount_ksh,status,created_at").in("wallet_id", walletIds) : { data: [] };
    activity = [
      ...(memberStories || []).map(row => ({ userId: row.user_id, kind: "Post", body: row.body, created_at: row.created_at })),
      ...(memberComments || []).map(row => ({ userId: row.user_id, kind: "Comment", body: row.body, created_at: row.created_at })),
      ...(memberReactions || []).map(row => ({ userId: row.user_id, kind: "Reaction", body: `Reacted ${row.type}`, created_at: row.created_at })),
      ...(memberBids || []).map(row => ({ userId: row.bidder_id, kind: "Gig interest", body: "Applied to a gig", created_at: row.created_at })),
      ...(memberApplications || []).map(row => ({ userId: row.applicant_id, kind: "Couple application", body: row.message, created_at: row.created_at })),
      ...(transactions || []).map(row => ({ userId: memberWallets?.find(wallet => wallet.id === row.wallet_id)?.user_id || "", kind: `Wallet ${row.type} · ${row.status}`, body: `Ksh ${Number(row.amount_ksh).toLocaleString()}`, created_at: row.created_at })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return (
    <main className="admin-page">
      <header className="admin-section-header"><div><p className="admin-eyebrow">PLATFORM CONTENT</p><h1>Content library</h1><p className="admin-subtitle">Browse content types and moderate them as a read-only viewer.</p></div><span className="admin-result-count">{visibleItems.length} shown · {items.length} total</span></header>
      <form className="admin-content-filter" role="search"><input className="input" type="search" name="q" defaultValue={searchParams?.q || ""} placeholder="Search post, author, or Comrade ID" /><select className="input" name="type" defaultValue={searchParams?.type || "all"}><option value="all">All content</option>{["story", "anonymous", "help", "advice", "gig", "couple", "comment"].map(type => <option key={type} value={type}>{type}</option>)}</select><button className="admin-action primary">Search</button></form>
      {safeQuery && <section className="admin-panel admin-member-activity"><h2>Member activity search</h2>{(matchedUsers || []).length === 0 ? <p className="admin-subtitle">No matching member was found.</p> : (matchedUsers || []).map(person => { const personActivity = activity.filter(event => event.userId === person.id); return <div className="admin-activity-member" key={person.id}><div><strong>{person.username ? `@${person.username}` : person.full_name || "Member"}</strong><small>Comrade ID {person.public_id || "—"} · {person.email}</small></div>{personActivity.length === 0 ? <p>No recent activity recorded.</p> : <ul>{personActivity.map((event, index) => <li key={`${event.created_at}-${index}`}><span>{event.kind}</span><p>{event.body}</p><time>{new Date(event.created_at).toLocaleString()}</time></li>)}</ul>}</div>; })}</section>}
      {visibleItems.length === 0 ? <p className="admin-empty">No content matches this search.</p> : <div className="admin-record-list">
        {visibleItems.map(item => {
          const author = authorNames.get(item.userId);
          return <article className="admin-record admin-content-record" key={`${item.type}-${item.id}`}>
            <div className="admin-content-heading">{author?.photo && <img className="admin-avatar-photo" src={author.photo} alt="" />}<div><div className="admin-badges"><span className="admin-badge neutral">{item.type}</span>{item.status && <span className={`admin-badge ${item.status === "active" ? "green" : "amber"}`}>{item.status}</span>}</div><p className="admin-record-title">{item.title}</p><p className="admin-record-meta">{author?.name || "Unknown member"} · ID {author?.publicId || "—"} · {new Date(item.createdAt).toLocaleString()}</p></div></div>
            <p className="admin-content-preview">{item.body}{item.second && item.second !== item.body ? `\n\n${item.second}` : ""}</p>
            {itemImages.get(`${item.type}-${item.id}`) && <img className="admin-story-image" src={itemImages.get(`${item.type}-${item.id}`) || ""} alt={`${item.type} attachment`} />}
            {item.type === "story" && <details className="admin-post-detail"><summary>View post, comments & reactions</summary>
              <div className="admin-reaction-summary">{["like", "love", "dislike", "laugh", "sad", "angry", "support"].map(type => {
                const emoji: Record<string, string> = { like: "👍", love: "❤️", dislike: "👎", laugh: "😂", sad: "😢", angry: "😡", support: "🤝" };
                const count = (reactions || []).filter(reaction => reaction.story_id === item.id && reaction.type === type).length;
                return <span key={type}>{emoji[type]} {count}</span>;
              })}</div>
              <div className="admin-story-comments">{(comments.data || []).filter(comment => comment.story_id === item.id).map(comment => {
                const commentAuthor = authorNames.get(comment.user_id);
                return <div className="admin-story-comment" key={comment.id}><div><p><strong>{commentAuthor?.name || "Member"}</strong>{comment.parent_comment_id && <small> · reply</small>}<br />{comment.body}</p>{commentImages.get(comment.id) && <img className="story-comment-image" src={commentImages.get(comment.id) || ""} alt="Comment attachment" />}</div><AdminContentTools type="comment" id={comment.id} field1={comment.body} readOnly /></div>;
              })}{!(comments.data || []).some(comment => comment.story_id === item.id) && <p className="admin-subtitle">No comments yet.</p>}</div>
            </details>}
            <AdminContentTools type={item.type} id={item.id} field1={item.type === "gig" ? item.title : item.body} field2={item.type === "advice" ? item.second : item.type === "gig" ? item.second : ""} status={item.status} />
            <AdminControl action="report_user" id={item.id} value={`Admin review · ${item.type}`} contentType={item.type} label="Report author / set read-only" tone="danger" confirmText="Flag this author for admin review and temporarily prevent posting and reacting while they can still browse?" />
          </article>;
        })}
      </div>}
    </main>
  );
}
