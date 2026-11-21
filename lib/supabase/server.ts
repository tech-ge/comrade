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
          // Auth cookies can be refreshed while a Server Component is rendering.
          // Next.js forbids cookie writes in that context; middleware and route
          // handlers persist refreshed cookies, so ignore writes from render only.
          try {
            cookieValues.forEach(({ name, value, options }) => {
              store.set(name, value, options);
            });
          } catch {
            // Cookies cannot be modified during Server Component rendering.
          }
        },
      },
    }
  );
};
