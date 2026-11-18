import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseServer = () => {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (n: string) => store.get(n)?.value,
        set: (n: string, v: string, o?: any) => store.set(n, v, o),
        remove: (n: string, o?: any) => store.delete(n),
      },
    }
  );
};