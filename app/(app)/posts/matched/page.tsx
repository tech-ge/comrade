import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MatchedPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: matches } = await sb
    .from("couple_matches")
    .select("id, published_first_names, published_at")
    .eq("published_in_feed", true)
    .order("published_at", { ascending: false })
    .limit(30);

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Matched</h1>
      {(matches || []).length === 0 ? (
        <p className="text-brand-gray text-sm">No published matches yet.</p>
      ) : (
        <ul className="space-y-2">
          {matches?.map((match) => (
            <li key={match.id} className="card">
              <p className="font-semibold">{match.published_first_names || "A new connection"}</p>
              {match.published_at && (
                <p className="text-xs text-brand-gray">{new Date(match.published_at).toLocaleDateString()}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
