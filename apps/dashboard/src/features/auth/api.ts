"use client";

import { fetchProfileRole } from "@medifast/supabase";
import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

type AuthFailure = {
  message: string;
  name: string;
  status: number;
};

export function isDashboardSupabaseConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function signInDashboardUser(email: string, password: string) {
  console.log("SIGNIN START", email);

  const supabase = getSupabaseBrowserClient();

  console.log("SUPABASE CLIENT READY");

  let authResponse: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;

  try {
    console.log("CALLING SUPABASE AUTH");

    authResponse = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    console.log("AUTH RESPONSE", authResponse);
  } catch (error) {
    console.error("SUPABASE AUTH THREW", error);
    
    const message = error instanceof Error ? error.message : "Unable to reach Supabase. Check your URL, anon key, and network connection.";
    const authError: AuthFailure = {
      name: "AuthRetryableFetchError",
      message,
      status: 0,
    };

    return {
      authResponse: {
        data: {
          user: null,
          session: null,
        },
        error: authError,
      } as Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>,
      role: null,
      profileError: authError,
    };
  }

  if (authResponse.error || !authResponse.data.user) {
    return {
      authResponse,
      role: null,
      profileError: authResponse.error,
    };
  }

  const profileResponse = await fetchProfileRole(supabase, authResponse.data.user.id);

  return {
    authResponse,
    role: profileResponse.data?.role ?? null,
    profileError: profileResponse.error,
  };
}

export async function signOutDashboardUser() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}
