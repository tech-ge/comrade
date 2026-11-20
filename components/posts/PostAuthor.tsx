export type PostAuthorData = { full_name?: string | null; first_name?: string | null; username?: string | null; public_id?: string | null; profile_photo?: string | null; deleted_at?: string | null };

export default function PostAuthor({ author, anonymous = false }: { author: PostAuthorData; anonymous?: boolean }) {
  const name = anonymous ? "Anonymous comrade" : author.deleted_at ? "Deleted user" : author.username ? `@${author.username}` : author.public_id || author.full_name || author.first_name || "Student";
  const secondary = anonymous ? "Anonymous post" : author.deleted_at ? "Account removed" : [author.username && (author.full_name || author.first_name), author.username && author.public_id && `Comrade ID ${author.public_id}`].filter(Boolean).join(" · ") || (author.username ? "Comrade Hub" : author.full_name || author.first_name || "Comrade ID");
  return <div className="post-author">
    {author.profile_photo ? <img src={author.profile_photo} alt="" className="post-author-avatar" /> : <span className="post-author-avatar post-author-fallback">{anonymous ? "A" : name.replace(/^@/, "")[0]?.toUpperCase() || "S"}</span>}
    <span className="post-author-copy"><strong>{name}</strong><small>{secondary}</small></span>
  </div>;
}
