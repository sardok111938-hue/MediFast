import type { Address, Category, Product, Vendor } from "@medifast/types";
import { useCallback, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "./supabase";

export type CustomerCatalogData = {
  addresses: Address[];
  categories: Category[];
  products: Product[];
  vendors: Vendor[];
  defaultAddressId: string | null;
};

type QueryCategory = {
  id: string;
  name: string;
  name_ar?: string | null;
  icon?: string | null;
};

type QueryVendor = {
  id: string;
  name: string;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  area?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
};

type QueryProduct = {
  id: string;
  vendor_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  barcode?: string | null;
  stock_quantity?: number | null;
  is_active?: boolean | null;
};

type QueryAddress = {
  id: string;
  customer_id?: string | null;
  line_1: string;
  lat?: number | null;
  lng?: number | null;
  created_at?: string | null;
};

type QueryCustomerAddressState = {
  default_address_id?: string | null;
};

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getEmptyCatalogData(): CustomerCatalogData {
  return {
    categories: [],
    products: [],
    vendors: [],
    addresses: [],
    defaultAddressId: null,
  };
}

function mapVendor(vendor: QueryVendor): Vendor {
  return {
    id: vendor.id,
    name: vendor.name,
    address: [vendor.address_line_1, vendor.address_line_2, vendor.area, vendor.city].filter(Boolean).join("، "),
    rating: 0,
    eta_minutes: 0,
    is_open: Boolean(vendor.is_active),
  };
}

function mapProduct(product: QueryProduct): Product {
  return {
    id: product.id,
    vendor_id: product.vendor_id,
    category_id: String(product.category_id ?? ""),
    name: product.name,
    description: String(product.description ?? ""),
    price: Number(product.price ?? 0),
    image_url: String(product.image_url ?? "https://placehold.co/800x800/E8F7EE/1A9C5A?text=MediFast"),
    barcode: product.barcode ?? null,
    stock_quantity: Number(product.stock_quantity ?? 0),
    is_active: Boolean(product.is_active),
  };
}

function mapCategory(category: QueryCategory): Category {
  return {
    id: category.id,
    name: category.name,
    name_ar: category.name_ar ?? null,
    icon: category.icon ?? "grid",
  };
}

function mapAddress(address: QueryAddress): Address {
  return {
    id: address.id,
    customer_id: address.customer_id ?? undefined,
    line_1: address.line_1,
    lat: address.lat ?? null,
    lng: address.lng ?? null,
    created_at: address.created_at ?? undefined,
  };
}

async function loadCustomerAddresses(): Promise<Pick<CustomerCatalogData, "addresses" | "defaultAddressId">> {
  const { data: customerId, error: customerError } = await supabase.rpc("get_customer_id");

  if (customerError) {
    throw customerError;
  }

  if (!customerId) {
    return {
      addresses: [],
      defaultAddressId: null,
    };
  }

  const [customerResult, addressesResult] = await Promise.all([
    supabase.from("customers").select("default_address_id").eq("id", String(customerId)).maybeSingle(),
    supabase.from("addresses").select("id, customer_id, line_1, lat, lng, created_at").eq("customer_id", String(customerId)).order("created_at", { ascending: true }),
  ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  if (addressesResult.error) {
    throw addressesResult.error;
  }

  const customerAddressState = customerResult.data as QueryCustomerAddressState | null;
  const defaultAddressId = customerAddressState?.default_address_id ? String(customerAddressState.default_address_id) : null;
  const addresses = ((addressesResult.data ?? []) as QueryAddress[]).map(mapAddress);

  return {
    defaultAddressId,
    addresses: addresses.sort((left, right) => Number(right.id === defaultAddressId) - Number(left.id === defaultAddressId)),
  };
}

export async function loadCustomerCatalogData(): Promise<CustomerCatalogData> {
  if (!isSupabaseConfigured()) {
    throw new Error("إعدادات Supabase غير مكتملة في تطبيق العميل.");
  }

  const [categoriesResult, vendorsResult, addressData] = await Promise.all([
    supabase.from("categories").select("id, name, name_ar, icon").order("name", { ascending: true }),
    supabase
      .from("vendors")
      .select("id, name, address_line_1, address_line_2, city, area, is_active, approval_status")
      .eq("is_active", true)
      .eq("approval_status", "approved"),
    loadCustomerAddresses(),
  ]);

  if (categoriesResult.error || vendorsResult.error) {
    throw categoriesResult.error ?? vendorsResult.error;
  }

  const categories = ((categoriesResult.data ?? []) as QueryCategory[]).map(mapCategory);
  const categoryIds = new Set(categories.map((category) => category.id));
  const vendors = ((vendorsResult.data ?? []) as QueryVendor[]).map(mapVendor);
  const activeVendorIds = vendors.map((vendor) => vendor.id);

  let products: Product[] = [];

  if (activeVendorIds.length > 0) {
    const { data: productsData, error: productsError } = await supabase
      .from("products")
      .select("id, vendor_id, category_id, name, description, price, image_url, barcode, stock_quantity, is_active")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .in("vendor_id", activeVendorIds)
      .order("created_at", { ascending: false });

    if (productsError) {
      throw productsError;
    }

    products = ((productsData ?? []) as QueryProduct[])
      .filter((product) => !product.category_id || categoryIds.has(String(product.category_id)))
      .map(mapProduct);
  }

  return {
    categories,
    vendors,
    products,
    addresses: addressData.addresses,
    defaultAddressId: addressData.defaultAddressId,
  };
}

export function useCustomerCatalogData() {
  const [data, setData] = useState<CustomerCatalogData>(getEmptyCatalogData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setData(getEmptyCatalogData());
      setLoading(false);
      setError("إعدادات Supabase غير مكتملة في تطبيق العميل.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(getEmptyCatalogData());

    try {
      setData(await loadCustomerCatalogData());
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "تعذر تحميل بيانات المتجر الآن.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    loading,
    error,
    reload,
  };
}

export function getFeaturedProducts(products: Product[]) {
  return products.slice(0, 4);
}

export function getPopularProducts(products: Product[]) {
  return [...products].sort((left, right) => right.stock_quantity - left.stock_quantity);
}

export function getPrimaryAddress(addresses: Address[], defaultAddressId?: string | null) {
  if (!defaultAddressId) {
    return null;
  }

  return addresses.find((address) => address.id === defaultAddressId) ?? null;
}

export function getSavedAddresses(addresses: Address[]) {
  return addresses;
}

export function formatSavedAddressLine(address: Pick<Address, "line_1">) {
  return address.line_1;
}

export function hasSavedAddressCoordinates(address: Pick<Address, "lat" | "lng">) {
  return typeof address.lat === "number" && typeof address.lng === "number";
}

export function getCategoryById(categories: Category[], categoryId?: string | null) {
  if (!categoryId) {
    return null;
  }

  return categories.find((category) => category.id === categoryId) ?? null;
}

export function getVendorById(vendors: Vendor[], vendorId?: string | null) {
  if (!vendorId) {
    return null;
  }

  return vendors.find((vendor) => vendor.id === vendorId) ?? null;
}

export function getProductById(products: Product[], productId?: string | null) {
  if (!productId) {
    return null;
  }

  return products.find((product) => product.id === productId) ?? null;
}

export function filterProducts(products: Product[], input: { categoryId?: string | null; query?: string | null }) {
  const normalizedQuery = normalizeQuery(input.query ?? "");

  return products.filter((product) => {
    const matchesCategory = !input.categoryId || product.category_id === input.categoryId;
    const matchesQuery =
      !normalizedQuery ||
      normalizeQuery(product.name).includes(normalizedQuery) ||
      normalizeQuery(product.description).includes(normalizedQuery) ||
      normalizeQuery(product.barcode ?? "").includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function useFilteredProducts(input: { categoryId?: string | null; query?: string | null }) {
  const { data } = useCustomerCatalogData();

  return useMemo(() => filterProducts(data.products, input), [data.products, input]);
}
