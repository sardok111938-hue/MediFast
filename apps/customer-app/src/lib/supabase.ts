import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAppSupabaseClient, resolveSupabaseConfig } from "@medifast/supabase";

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

type CustomerBootstrapInput = {
  authUserId?: string;
  fullName?: string | null;
  phone?: string | null;
};

export async function ensureCustomerBootstrap({ fullName, phone }: CustomerBootstrapInput) {
  const safeFullName = fullName?.trim() || "عميل بدون اسم";

  const { data, error } = await supabase.rpc("ensure_customer_account", {
    p_full_name: safeFullName,
    p_phone: phone?.trim() || null,
  });

  if (error) {
    throw error;
  }

  return {
    customerId: String(data),
  };
}

export async function signInCustomer(email: string, password: string) {
  const response = await supabase.auth.signInWithPassword({ email, password });

  if (response.error || !response.data.user) {
    return response;
  }

  await ensureCustomerBootstrap({
    authUserId: response.data.user.id,
    fullName:
      typeof response.data.user.user_metadata?.full_name === "string"
        ? response.data.user.user_metadata.full_name
        : null,
  });

  return response;
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

  await ensureCustomerBootstrap({
    authUserId: response.data.user.id,
    fullName,
  });

  return response;
}

export async function updateCustomerProfile({
  fullName,
  phone,
}: {
  fullName: string;
  phone?: string | null;
}) {
  const sessionResponse = await supabase.auth.getSession();
  const user = sessionResponse.data.session?.user;

  if (!user) {
    throw new Error("يجب تسجيل الدخول لتحديث الحساب.");
  }

  await ensureCustomerBootstrap({
    authUserId: user.id,
    fullName,
    phone,
  });

  const { error: metadataError } = await supabase.auth.updateUser({
    data: {
      full_name: fullName.trim(),
    },
  });

  if (metadataError) {
    throw metadataError;
  }

  return {
    ok: true,
  };
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
      onChange,
    )
    .subscribe();
}

export function subscribeToOrderTracking(orderId: string, onChange: (payload: unknown) => void) {
  return supabase
    .channel(`customer-order-${orderId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `id=eq.${orderId}` },
      onChange,
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "delivery_tracking", filter: `order_id=eq.${orderId}` },
      onChange,
    )
    .subscribe();
}