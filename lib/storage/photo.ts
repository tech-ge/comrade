import { supabaseAdmin } from "@/lib/supabase/admin";

export async function resolvePhotoUrl(value: string | null | undefined) {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const { data, error } = await supabaseAdmin().storage.from("user-photos").createSignedUrl(value, 60 * 60);
  return error ? null : data.signedUrl;
}
