import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAppSupabaseClient, resolveSupabaseConfig, upsertCustomerProfile } from "@medifast/supabase";

const { url, anonKey, isConfigured } = resolveSupabaseConfig("expo");

export const supabase = createAppSupabaseClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured() {
  return isConfigured;
}

export async function signInCustomer(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpCustomer({
  email,
  password,
  fullName,
}: {
  email: string;
  password: string;
  fullName: string;
}) {
  const response = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        role: "customer",
      },
    },
  });

  if (response.error || !response.data.user) {
    return response;
  }

  const profileResponse = await upsertCustomerProfile(supabase, response.data.user.id, fullName);

  if (!profileResponse.error && profileResponse.data?.id) {
    await supabase.from("customers").upsert(
      {
        user_id: profileResponse.data.id,
      },
      {
        onConflict: "user_id",
      }
    );
  }

  return response;
}

export async function signOutCustomer() {
  return supabase.auth.signOut();
}

export function subscribeToCustomerOrders(customerId: string, onChange: (payload: unknown) => void) {
  return supabase
    .channel(`customer-orders-${customerId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `customer_id=eq.${customerId}` },
      onChange
    )
    .subscribe();
}

export function subscribeToOrderTracking(orderId: string, onChange: (payload: unknown) => void) {
  return supabase
    .channel(`customer-order-${orderId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "delivery_tracking", filter: `order_id=eq.${orderId}` },
      onChange
    )
    .subscribe();
}
