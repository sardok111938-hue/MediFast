import { createServerClient, type CookieOptions } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type SupabaseCookie = {
  name: string;
  value: string;
  options: CookieOptions;
};

function getSupabaseServerConfig() {
  if (!url || !anonKey) {
    throw new Error("Missing Supabase env variables");
  }

  return { url, anonKey };
}

export async function getSupabaseServerClient(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  const { url: supabaseUrl, anonKey: supabaseAnonKey } = getSupabaseServerConfig();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: SupabaseCookie[]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components can read request cookies but may not be able to persist refreshed auth cookies.
        }
      },
    },
  });
}
