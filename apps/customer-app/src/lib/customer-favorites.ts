import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const FAVORITES_CACHE_KEY = "medifast_customer_favorite_product_ids";

function parseFavoriteIds(value: string | null) {
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

async function cacheFavoriteIds(ids: string[]) {
  await AsyncStorage.setItem(FAVORITES_CACHE_KEY, JSON.stringify(ids));
}

export async function listCachedFavoriteProductIds() {
  const raw = await AsyncStorage.getItem(FAVORITES_CACHE_KEY);

  return parseFavoriteIds(raw);
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

export async function listCustomerFavoriteProductIds() {
  try {
    const customerId = await getCustomerId();

    const { data, error } = await supabase
      .from("customer_favorite_products")
      .select("product_id")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    const ids = (data ?? [])
      .map((row) => row.product_id)
      .filter((id): id is string => typeof id === "string");

    await cacheFavoriteIds(ids);

    return ids;
  } catch {
    return listCachedFavoriteProductIds();
  }
}

export async function isCustomerFavoriteProduct(productId: string) {
  const ids = await listCustomerFavoriteProductIds();

  return ids.includes(productId);
}

export async function toggleCustomerFavoriteProduct(productId: string) {
  const customerId = await getCustomerId();
  const currentIds = await listCustomerFavoriteProductIds();

  const isFavorite = currentIds.includes(productId);

  if (isFavorite) {
    const { error } = await supabase
      .from("customer_favorite_products")
      .delete()
      .eq("customer_id", customerId)
      .eq("product_id", productId);

    if (error) {
      throw error;
    }

    const nextIds = currentIds.filter((id) => id !== productId);

    await cacheFavoriteIds(nextIds);

    return {
      isFavorite: false,
      favoriteIds: nextIds,
    };
  }

  const { error } = await supabase
    .from("customer_favorite_products")
    .insert({
      customer_id: customerId,
      product_id: productId,
    });

  if (error) {
    throw error;
  }

  const nextIds = [productId, ...currentIds];

  await cacheFavoriteIds(nextIds);

  return {
    isFavorite: true,
    favoriteIds: nextIds,
  };
}