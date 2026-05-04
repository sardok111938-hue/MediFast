"use client";

import { createAppSupabaseClient } from "@medifast/supabase";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error("Missing Supabase env variables");
}

export const supabase = createAppSupabaseClient(url, anonKey);

export function getSupabaseBrowserClient() {
  return supabase;
}