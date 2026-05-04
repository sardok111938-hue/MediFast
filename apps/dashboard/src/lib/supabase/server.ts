import { createWebSupabaseClient } from "@medifast/supabase";

export function getSupabaseServerClient() {
  return createWebSupabaseClient();
}