import { notFound, redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { resolvePhotoUrl } from "@/lib/storage/photo";
import CoupleApplicationForm from "@/components/couples/CoupleApplicationForm";

export const dynamic = "force-dynamic";

export default async function CouplePostDetails({ params }: { params: { id: string } }) {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");
  const { data: post } = await sb.from("couple_posts").select("id,user_id,description,photo_url,status,created_at").eq("id", params.id).maybeSingle();
  if (!post || post.status !== "active") notFound();
  const photo = await resolvePhotoUrl(post.photo_url);
  const { data: author } = await sb.from("users").select("full_name,username,public_id,profile_photo_url").eq("id", post.user_id).maybeSingle();
  return <main className="couple-detail-page">
    <article className="couple-detail-card">
      <div className="couple-detail-image">{photo && !photo.startsWith("/") ? <img src={photo} alt="Connection profile" /> : <div className="couple-photo-placeholder"><span>🌷 🌼 🌸</span><strong>A new connection could start here</strong></div>}</div>
      <div className="couple-card-content"><div className="couple-detail-author">{author?.profile_photo_url && <img src={await resolvePhotoUrl(author.profile_photo_url) || ""} alt="" />}<div><strong>{author?.username ? `@${author.username}` : author?.full_name || "Comrade"}</strong><small>Comrade ID {author?.public_id || "—"}</small></div></div><p className="couple-detail-description">{post.description}</p>{post.user_id === user.id ? <p className="couple-owner-note">This is your post. Views and applications are listed on the couples page.</p> : <CoupleApplicationForm postId={post.id} />}</div>
    </article>
  </main>;
}
