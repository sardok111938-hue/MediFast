import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Session } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { fetchProfileRole } from "@medifast/supabase";
import { registerDriverPushToken } from "./notifications";

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

/**
 * Safe session reset (idempotent)
 */
const resetSession = async () => {
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {}
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

/**
 * Wait for persisted session (driver app startup safety)
 */
async function waitForPersistedSession(timeoutMs = 2000): Promise<Session | null> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const { data } = await supabase.auth.getSession();

    if (data.session) return data.session;

    await new Promise((r) => setTimeout(r, 100));
  }

  return null;
}

export async function getActiveSession() {
  const sessionResponse = await supabase.auth.getSession();

  if (sessionResponse.error) {
  console.log("Session error:", sessionResponse.error);
  return null;
}

  if (sessionResponse.data.session) {
    return sessionResponse.data.session;
  }

  return await waitForPersistedSession();
}

export async function getAuthenticatedUser() {
  const session = await getActiveSession();

  if (!session) return null;

  const userResponse = await supabase.auth.getUser();
  if (userResponse.error) throw userResponse.error;

  return userResponse.data.user ?? session.user ?? null;
}

export async function signUpDriver({
  email,
  password,
  fullName,
  phone,
  vehicleType,
  vehiclePlate,
}: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  vehicleType: string;
  vehiclePlate: string;
}) {
  const safeEmail = email.trim();
  const safeFullName = fullName.trim();
  const safePhone = normalizePhone(phone);
  const safeVehicleType = vehicleType.trim();
  const safeVehiclePlate = vehiclePlate.trim();

  const authResponse = await supabase.auth.signUp({
    email: safeEmail,
    password,
    options: {
      data: {
        full_name: safeFullName,
        phone: safePhone,
        role: "driver",
      },
    },
  });

  if (authResponse.error || !authResponse.data.user) {
    return authResponse;
  }

  const { error } = await supabase.rpc("register_driver_account", {
    p_full_name: safeFullName,
    p_phone: safePhone,
    p_vehicle_type: safeVehicleType,
    p_vehicle_plate: safeVehiclePlate,
  });

  if (error) {
    await resetSession();
    return { ...authResponse, error };
  }

  await resetSession();
  return authResponse;
}

export async function signInDriver(email: string, password: string) {
  await resetSession();

  const authResponse = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (authResponse.error || !authResponse.data.user) {
    return authResponse;
  }

  if (!authResponse.data.session) {
    await resetSession();
    return {
      ...authResponse,
      error: new Error("تعذر إنشاء جلسة السائق على هذا الجهاز."),
    };
  }

  const roleResponse = await fetchProfileRole(
    supabase,
    authResponse.data.user.id
  );

  if (roleResponse.error || roleResponse.data?.role !== "driver") {
    await resetSession();
    return {
      ...authResponse,
      error: new Error("هذا الحساب غير معتمد للوصول إلى تطبيق السائق."),
    };
  }

  const { data: driverId, error: driverIdError } = await supabase.rpc(
    "get_driver_id"
  );

  if (driverIdError || !driverId) {
    await resetSession();
    return {
      ...authResponse,
      error: driverIdError ?? new Error("هذا الحساب غير مرتبط بملف سائق."),
    };
  }

  const { data: driver, error: driverError } = await supabase
    .from("drivers")
    .select("approval_status")
    .eq("id", driverId)
    .maybeSingle();

  if (driverError || driver?.approval_status !== "approved") {
    await resetSession();
    return {
      ...authResponse,
      error: driverError ?? new Error("حساب السائق بانتظار الاعتماد من الإدارة."),
    };
  }

  try {
    await registerDriverPushToken(supabase, String(driverId));
  } catch (error) {
    console.log("DRIVER PUSH TOKEN REGISTER ERROR", error);
  }

  return authResponse;
}

export async function signOutDriver() {
  await resetSession();
}

export function subscribeToAssignedOrders(
  driverId: string,
  onChange: (payload: unknown) => void
) {
  return supabase
    .channel(`driver-orders-${driverId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "orders",
        filter: `driver_id=eq.${driverId}`,
      },
      onChange
    )
    .subscribe();
}

export function subscribeToAvailablePickupOrders(
  onChange: (payload: unknown) => void
) {
  return supabase
    .channel("driver-available-pickups")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "orders",
        filter: "order_status=eq.ready_for_pickup",
      },
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