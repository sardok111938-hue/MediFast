import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { fetchProfileRole } from "@medifast/supabase";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const authStorageKey = "medifast-driver-auth-token";

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, {
  auth: {
    storage: AsyncStorage,
    storageKey: authStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

async function waitForPersistedSession(timeoutMs = 2500): Promise<Session | null> {
  return await new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      subscription.data.subscription.unsubscribe();
      resolve(null);
    }, timeoutMs);

    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        return;
      }

      clearTimeout(timeoutId);
      subscription.data.subscription.unsubscribe();
      resolve(session);
    });
  });
}

export async function getActiveSession() {
  const sessionResponse = await supabase.auth.getSession();

  if (sessionResponse.error) {
    throw sessionResponse.error;
  }

  if (sessionResponse.data.session) {
    return sessionResponse.data.session;
  }

  return await waitForPersistedSession();
}

export async function getAuthenticatedUser() {
  const session = await getActiveSession();

  if (!session) {
    return null;
  }

  const userResponse = await supabase.auth.getUser();
  if (userResponse.error) {
    throw userResponse.error;
  }

  return userResponse.data.user ?? session.user ?? null;
}

export async function signOutDriver() {
  await supabase.auth.signOut({ scope: "local" });
  await AsyncStorage.removeItem(authStorageKey);
}

export async function signInDriver(email: string, password: string) {
  await signOutDriver();

  const authResponse = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (authResponse.error || !authResponse.data.user) {
    return authResponse;
  }

  const activeSession = await getActiveSession();
  if (!activeSession || activeSession.user.id !== authResponse.data.user.id) {
    await signOutDriver();
    return {
      ...authResponse,
      error: new Error("تعذر إنشاء جلسة السائق على هذا الجهاز."),
    };
  }

  const roleResponse = await fetchProfileRole(supabase, authResponse.data.user.id);

  if (roleResponse.error || roleResponse.data?.role !== "driver") {
    await signOutDriver();
    return {
      ...authResponse,
      error: new Error("هذا الحساب غير معتمد للوصول إلى تطبيق السائق."),
    };
  }

  return authResponse;
}

export function subscribeToAssignedOrders(driverId: string, onChange: (payload: unknown) => void) {
  return supabase
    .channel(`driver-orders-${driverId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `driver_id=eq.${driverId}` },
      onChange
    )
    .subscribe();
}

export async function publishDriverLocation({
  driverId,
  orderId,
  lat,
  lng,
  status,
}: {
  driverId: string;
  orderId: string;
  lat: number;
  lng: number;
  status: string;
}) {
  return supabase.from("delivery_tracking").insert({
    driver_id: driverId,
    order_id: orderId,
    lat,
    lng,
    status,
  });
}
