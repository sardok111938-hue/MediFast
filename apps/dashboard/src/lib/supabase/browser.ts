"use client";

import { createAppSupabaseClient, resolveSupabaseConfig } from "@medifast/supabase";

const { url, anonKey, isConfigured } = resolveSupabaseConfig("web");

if (!isConfigured) {
  throw new Error("Missing Supabase env variables");
}

export const supabase = createAppSupabaseClient(url, anonKey);

export function getSupabaseBrowserClient() {
  return supabase;
}
