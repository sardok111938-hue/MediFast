"use client";

import { getSupabaseBrowserClient } from "../../lib/supabase/browser";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function getCurrentSessionUserClient() {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}

export async function getCurrentProfileClient(authUserId: string) {
  const supabase = getSupabaseBrowserClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return data;
}

export async function getCurrentProfileServer(authUserId: string) {
  const supabase = getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return data;
}
