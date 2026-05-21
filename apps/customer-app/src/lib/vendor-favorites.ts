import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const FAVORITE_VENDORS_CACHE_KEY = "medifast_customer_favorite_vendor_ids";

function parseVendorIds(value: string | null) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

async function cacheVendorIds(ids: string[]) {
  await AsyncStorage.setItem(
    FAVORITE_VENDORS_CACHE_KEY,
    JSON.stringify(ids),
  );
}

export async function listCachedFavoriteVendorIds() {
  const raw = await AsyncStorage.getItem(FAVORITE_VENDORS_CACHE_KEY);

  return parseVendorIds(raw);
}

async function getCustomerId() {
  const { data, error } = await supabase.rpc("get_customer_id");

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر تحديد العميل.");
  }

  return String(data);
}

export async function listCustomerFavoriteVendorIds() {
  try {
    const customerId = await getCustomerId();

    const { data, error } = await supabase
      .from("customer_favorite_vendors")
      .select("vendor_id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const ids = (data ?? [])
      .map((row) => row.vendor_id)
      .filter((id): id is string => typeof id === "string");

    await cacheVendorIds(ids);

    return ids;
  } catch {
    return listCachedFavoriteVendorIds();
  }
}

export async function isCustomerFavoriteVendor(vendorId: string) {
  const ids = await listCustomerFavoriteVendorIds();

  return ids.includes(vendorId);
}

export async function toggleCustomerFavoriteVendor(vendorId: string) {
  const customerId = await getCustomerId();
  const currentIds = await listCustomerFavoriteVendorIds();

  const isFavorite = currentIds.includes(vendorId);

  if (isFavorite) {
    const { error } = await supabase
      .from("customer_favorite_vendors")
      .delete()
      .eq("customer_id", customerId)
      .eq("vendor_id", vendorId);

    if (error) {
      throw error;
    }

    const nextIds = currentIds.filter((id) => id !== vendorId);

    await cacheVendorIds(nextIds);

    return {
      isFavorite: false,
      favoriteVendorIds: nextIds,
    };
  }

  const { error } = await supabase
    .from("customer_favorite_vendors")
    .insert({
      customer_id: customerId,
      vendor_id: vendorId,
    });

  if (error) {
    throw error;
  }

  const nextIds = [vendorId, ...currentIds];

  await cacheVendorIds(nextIds);

  return {
    isFavorite: true,
    favoriteVendorIds: nextIds,
  };
}