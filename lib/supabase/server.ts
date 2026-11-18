import { createServerClient } from "@supabase/ssr";
import type { SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

export const supabaseServer = () => {
  const store = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (cookieValues: Parameters<SetAllCookies>[0]) => {
          cookieValues.forEach(({ name, value, options }) => {
            store.set(name, value, options);
          });
        },
      },
    }
  );
};