import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const sb = supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: messages } = await sb
    .from("system_messages")
    .select("id, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <main className="max-w-2xl mx-auto px-4 pt-4">
      <h1 className="text-2xl font-bold mb-3">Notifications</h1>
      {(messages || []).length === 0 ? (
        <p className="text-brand-gray text-sm">No system messages.</p>
      ) : (
        <ul className="space-y-2">
          {messages?.map((message) => (
            <li key={message.id} className="card">
              <p className="font-semibold">{message.title}</p>
              <p className="text-sm mt-1 whitespace-pre-wrap">{message.body}</p>
              <p className="text-xs text-brand-gray mt-2">{new Date(message.created_at).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
