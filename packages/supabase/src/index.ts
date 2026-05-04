import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

const fallbackUrl = "https://invalid.local";
const fallbackAnonKey = "invalid-anon-key";

export function resolveSupabaseConfig(
  platform: "expo" | "web",
  env: Record<string, string | undefined> = process.env
) {
  const urlKey = platform === "expo" ? "EXPO_PUBLIC_SUPABASE_URL" : "NEXT_PUBLIC_SUPABASE_URL";
  const anonKey = platform === "expo" ? "EXPO_PUBLIC_SUPABASE_ANON_KEY" : "NEXT_PUBLIC_SUPABASE_ANON_KEY";

  return {
    url: env[urlKey] ?? fallbackUrl,
    anonKey: env[anonKey] ?? fallbackAnonKey,
    isConfigured: Boolean(env[urlKey] && env[anonKey]),
  };
}

export function createAppSupabaseClient(
  url: string,
  anonKey: string,
  options?: SupabaseClientOptions<"public">
): SupabaseClient {
  return createClient(url, anonKey, options);
}

export function createWebSupabaseClient() {
  const { url, anonKey } = resolveSupabaseConfig("web");
  return createAppSupabaseClient(url, anonKey);
}

export async function fetchProfileRole(client: SupabaseClient, authUserId: string) {
  const response = await client
    .from("profiles")
    .select("role")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  return response;
}

export async function upsertCustomerProfile(client: SupabaseClient, authUserId: string, fullName: string) {
  return client
    .from("profiles")
    .upsert(
    {
      auth_user_id: authUserId,
      full_name: fullName,
      role: "customer",
    },
    {
      onConflict: "auth_user_id",
    }
    )
    .select("id")
    .single();
}

export const storageBuckets = {
  productImages: "product-images",
};
