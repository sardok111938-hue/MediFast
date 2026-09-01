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

export type ProductOffer = {
  product: Product;
  vendor: Vendor | null;
};

export type GroupedProduct = {
  id: string;
  normalizedName: string;
  name: string;

  lowestPrice: number;
  highestPrice: number;

  pharmaciesCount: number;

  image_url: string;
  category_id: string;

  offers: ProductOffer[];

  representativeProduct: Product;
};

type QueryCategory = {
  id: string;
  name: string;
  name_ar?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  slug?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

type QueryVendor = {
  id: string;
  name: string;
  vendor_type?: Vendor["vendor_type"] | null;
  phone?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  city?: string | null;
  area?: string | null;
  image_url?: string | null;
  is_active?: boolean | null;
  approval_status?: string | null;
  lat?: number | null;
  lng?: number | null;
  delivery_radius_km?: number | null;
  completed_orders?: number | null;
  vendor_operating_hours?: QueryOperatingHour[] | null;
};

type QueryOperatingHour = {
  day_of_week: number;
  opens_at?: string | null;
  closes_at?: string | null;
  is_closed?: boolean | null;
};

type QueryProduct = {
  id: string;
  vendor_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  display_image_url?: string | null;
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

export type PharmacySubcategory = {
  id: string;
  label: string;
  icon: string;
  imageUrl: string | null;
  sortOrder: number;
  category: Category;
};

export type PharmacyParentCategory = {
  id: string;
  label: string;
  icon: string;
  imageUrl: string | null;
  sortOrder: number;
  category: Category;
  subcategories: PharmacySubcategory[];
};

export type PharmacyCategoryTree = {
  parents: PharmacyParentCategory[];
  categoryById: Map<string, Category>;
  childCategoriesByParentId: Map<string, Category[]>;
  categoryAndDescendantIdsById: Map<string, Set<string>>;
};

export type CategoryTheme = {
  background: string;
  border: string;
  accent: string;
  accentSoft: string;
  text: string;
};

const defaultCategoryTheme: CategoryTheme = {
  background: "#F6FBF8",
  border: "#DCEBE2",
  accent: "#127244",
  accentSoft: "#E4F4EA",
  text: "#153427",
};

const categoryVisuals: Record<
  string,
  {
    icon: string;
    theme: CategoryTheme;
    gradient: readonly [string, string];
    fallbackImage: string;
    subtitle: string;
  }
> = {
  medicine: {
    icon: "medical-outline",
    theme: {
      background: "#F1FAF5",
      border: "#CDEBDD",
      accent: "#127244",
      accentSoft: "#DDF3E7",
      text: "#123B2A",
    },
    gradient: ["#F4FBF7", "#DDF3E7"],
    fallbackImage: "https://placehold.co/800x600/F1FAF5/127244?text=Medicine",
    subtitle: "الأدوية اليومية والوصفات الأساسية",
  },
  "medical-devices": {
    icon: "fitness-outline",
    theme: {
      background: "#F2F8FF",
      border: "#D5E8FA",
      accent: "#2563A7",
      accentSoft: "#E1F0FF",
      text: "#173456",
    },
    gradient: ["#F5FAFF", "#E1F0FF"],
    fallbackImage: "https://placehold.co/800x600/F2F8FF/2563A7?text=Devices",
    subtitle: "أجهزة قياس ومستلزمات طبية منزلية",
  },
  "personal-care": {
    icon: "sparkles-outline",
    theme: {
      background: "#FFF7F2",
      border: "#F4DDD1",
      accent: "#B96532",
      accentSoft: "#FCE8DD",
      text: "#4A2B1B",
    },
    gradient: ["#FFF9F5", "#FCE8DD"],
    fallbackImage: "https://placehold.co/800x600/FFF7F2/B96532?text=Care",
    subtitle: "احتياجات العناية اليومية والنظافة",
  },
  "skin-hair-care": {
    icon: "leaf-outline",
    theme: {
      background: "#F7F6FF",
      border: "#E1DDF6",
      accent: "#6F5AA8",
      accentSoft: "#EAE5FA",
      text: "#332A50",
    },
    gradient: ["#FAF9FF", "#EAE5FA"],
    fallbackImage: "https://placehold.co/800x600/F7F6FF/6F5AA8?text=Skin+Hair",
    subtitle: "روتين البشرة والشعر من الصيدلية",
  },
  "mother-baby": {
    icon: "heart-outline",
    theme: {
      background: "#FFF5F7",
      border: "#F4D7DF",
      accent: "#B84E6A",
      accentSoft: "#FBE3EA",
      text: "#512633",
    },
    gradient: ["#FFF9FA", "#FBE3EA"],
    fallbackImage:
      "https://placehold.co/800x600/FFF5F7/B84E6A?text=Mother+Baby",
    subtitle: "رعاية الأم والطفل بلطف ووضوح",
  },
  "vitamins-nutrition": {
    icon: "nutrition-outline",
    theme: {
      background: "#F8FAEF",
      border: "#E3EBC9",
      accent: "#6F8329",
      accentSoft: "#EDF5D5",
      text: "#394418",
    },
    gradient: ["#FBFCF4", "#EDF5D5"],
    fallbackImage: "https://placehold.co/800x600/F8FAEF/6F8329?text=Vitamins",
    subtitle: "فيتامينات ومكملات لدعم الصحة اليومية",
  },
};

function normalizeSlug(slug?: string | null) {
  return slug?.trim() ?? "";
}

function getVisualForSlug(slug?: string | null) {
  return (
    categoryVisuals[normalizeSlug(slug)] ?? {
      icon: "grid-outline",
      theme: defaultCategoryTheme,
      gradient: ["#F8FCF9", "#E4F4EA"] as const,
      fallbackImage: "https://placehold.co/800x600/F8FCF9/127244?text=MediFast",
      subtitle: "منتجات صيدلية منظمة حسب احتياجك",
    }
  );
}

export function getCategoryIcon(slug?: string | null) {
  return getVisualForSlug(slug).icon;
}

export function getCategoryTheme(slug?: string | null) {
  return getVisualForSlug(slug).theme;
}

export function getCategoryGradient(slug?: string | null) {
  return getVisualForSlug(slug).gradient;
}

export function getCategoryFallbackImage(slug?: string | null) {
  return getVisualForSlug(slug).fallbackImage;
}

export function getCategorySubtitle(slug?: string | null) {
  return getVisualForSlug(slug).subtitle;
}

function normalizeProductName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getLibyaDateParts() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Tripoli",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );

  const dayByLabel: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return {
    day: dayByLabel[weekday ?? ""] ?? new Date().getDay(),
    minutes: hour * 60 + minute,
  };
}

function readTimeMinutes(value?: string | null) {
  if (!value) {
    return null;
  }

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText ?? 0);

  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return null;
  }

  return hour * 60 + minute;
}

function isVendorOpen(hours?: QueryOperatingHour[] | null) {
  if (!hours || hours.length === 0) {
    return false;
  }

  const { day, minutes } = getLibyaDateParts();
  const todayHours = hours.find((hour) => hour.day_of_week === day);

  if (
    !todayHours ||
    todayHours.is_closed ||
    !todayHours.opens_at ||
    !todayHours.closes_at
  ) {
    return false;
  }

  const opensAtMinutes = readTimeMinutes(todayHours.opens_at);
  const closesAtMinutes = readTimeMinutes(todayHours.closes_at);

  if (opensAtMinutes === null || closesAtMinutes === null) {
    return false;
  }

  return minutes >= opensAtMinutes && minutes < closesAtMinutes;
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
    vendor_type: vendor.vendor_type ?? "pharmacy",
    phone: vendor.phone ?? null,
    address: [
      vendor.address_line_1,
      vendor.address_line_2,
      vendor.area,
      vendor.city,
    ]
      .filter(Boolean)
      .join("، "),
    rating: 0,
    eta_minutes: 0,
    completed_orders: Number(vendor.completed_orders ?? 0),
    is_open:
      Boolean(vendor.is_active) && isVendorOpen(vendor.vendor_operating_hours),
    image_url: vendor.image_url ?? null,
    lat: vendor.lat ?? null,
    lng: vendor.lng ?? null,
    delivery_radius_km: vendor.delivery_radius_km ?? null,
    operating_hours:
      vendor.vendor_operating_hours?.map((hour) => ({
        day_of_week: hour.day_of_week,
        opens_at: hour.opens_at ?? null,
        closes_at: hour.closes_at ?? null,
        is_closed: Boolean(hour.is_closed),
      })) ?? [],
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
    image_url:
      product.display_image_url?.trim() || product.image_url?.trim() || "",
    barcode: product.barcode ?? null,
    stock_quantity: Number(product.stock_quantity ?? 0),
    is_active: Boolean(product.is_active),
  };
}

export async function fetchCustomerProductById(productId: string) {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from("products_with_global_images")
    .select(
      "id, vendor_id, category_id, name, description, price, image_url, display_image_url, barcode, stock_quantity, is_active",
    )
    .eq("id", productId)
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapProduct(data as QueryProduct) : null;
}

function mapCategory(category: QueryCategory): Category {
  return {
    id: category.id,
    name: category.name,
    name_ar: category.name_ar ?? null,
    icon: category.icon ?? "grid",
    parent_id: category.parent_id ?? null,
    slug: category.slug ?? null,
    sort_order: Number(category.sort_order ?? 0),
    image_url: category.image_url ?? null,
    is_active: category.is_active ?? true,
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

export function groupProductsByMarketplaceListing(
  products: Product[],
  vendors: Vendor[],
): GroupedProduct[] {
  const grouped = new Map<string, GroupedProduct>();

  for (const product of products) {
    const normalizedName = normalizeProductName(product.name);

    const existing = grouped.get(normalizedName);

    const vendor =
      vendors.find((item) => item.id === product.vendor_id) ?? null;

    if (!existing) {
      grouped.set(normalizedName, {
        id: normalizedName,
        normalizedName,
        name: product.name,

        lowestPrice: product.price,
        highestPrice: product.price,

        pharmaciesCount: 1,

        image_url: product.image_url,
        category_id: product.category_id,

        representativeProduct: product,

        offers: [
          {
            product,
            vendor,
          },
        ],
      });

      continue;
    }

    existing.lowestPrice = Math.min(existing.lowestPrice, product.price);

    existing.highestPrice = Math.max(existing.highestPrice, product.price);

    existing.offers.push({
      product,
      vendor,
    });

    existing.pharmaciesCount = existing.offers.length;

    if (!existing.image_url && product.image_url) {
      existing.image_url = product.image_url;
    }
  }

  return [...grouped.values()].sort(
    (left, right) => left.lowestPrice - right.lowestPrice,
  );
}

async function loadCustomerAddresses(): Promise<
  Pick<CustomerCatalogData, "addresses" | "defaultAddressId">
> {
  const { data: customerId, error: customerError } =
    await supabase.rpc("get_customer_id");

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
    supabase
      .from("customers")
      .select("default_address_id")
      .eq("id", String(customerId))
      .maybeSingle(),
    supabase
      .from("addresses")
      .select("id, customer_id, line_1, lat, lng, created_at")
      .eq("customer_id", String(customerId))
      .order("created_at", { ascending: true }),
  ]);

  if (customerResult.error) {
    throw customerResult.error;
  }

  if (addressesResult.error) {
    throw addressesResult.error;
  }

  const customerAddressState =
    customerResult.data as QueryCustomerAddressState | null;
  const defaultAddressId = customerAddressState?.default_address_id
    ? String(customerAddressState.default_address_id)
    : null;
  const addresses = ((addressesResult.data ?? []) as QueryAddress[]).map(
    mapAddress,
  );

  return {
    defaultAddressId,
    addresses: addresses.sort(
      (left, right) =>
        Number(right.id === defaultAddressId) -
        Number(left.id === defaultAddressId),
    ),
  };
}

export function useCustomerAddressesData() {
  const [data, setData] = useState<
    Pick<CustomerCatalogData, "addresses" | "defaultAddressId">
  >({
    addresses: [],
    defaultAddressId: null,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await loadCustomerAddresses());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "تعذر تحميل العناوين الآن.",
      );
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

export async function loadCustomerCatalogData(): Promise<CustomerCatalogData> {
  if (!isSupabaseConfigured()) {
    throw new Error("إعدادات Supabase غير مكتملة في تطبيق الزبون.");
  }

  const [categoriesResult, vendorsResult, addressData] = await Promise.all([
    supabase
      .from("categories")
      .select(
        "id, name, name_ar, icon, parent_id, slug, sort_order, image_url, is_active",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("vendors")
      .select(
        `
  id,
  name,
  vendor_type,
  phone,
  completed_orders,
  address_line_1,
  address_line_2,
  city,
  area,
  image_url,
  is_active,
  approval_status,
  lat,
  lng,
  delivery_radius_km,
  vendor_operating_hours (
    day_of_week,
    opens_at,
    closes_at,
    is_closed
  )
`,
      )
      .eq("is_active", true)
      .eq("approval_status", "approved"),
    loadCustomerAddresses(),
  ]);

  if (categoriesResult.error || vendorsResult.error) {
    throw categoriesResult.error ?? vendorsResult.error;
  }

  const categories = ((categoriesResult.data ?? []) as QueryCategory[]).map(
    mapCategory,
  );
  const categoryIds = new Set(categories.map((category) => category.id));
  const vendors = ((vendorsResult.data ?? []) as QueryVendor[]).map(mapVendor);
  const activeVendorIds = vendors.map((vendor) => vendor.id);

  let products: Product[] = [];

  if (activeVendorIds.length > 0) {
    const { data: productsData, error: productsError } = await supabase
      .from("products_with_global_images")
      .select(
        "id, vendor_id, category_id, name, description, price, image_url, display_image_url, barcode, stock_quantity, is_active",
      )
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .in("vendor_id", activeVendorIds)
      .order("created_at", { ascending: false })
      .limit(80);

    if (productsError) {
      throw productsError;
    }

    products = ((productsData ?? []) as QueryProduct[])
      .filter(
        (product) =>
          !product.category_id || categoryIds.has(String(product.category_id)),
      )
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
export async function searchProducts(query: string): Promise<Product[]> {
  const term = query.trim();

  if (!term) {
    return [];
  }

  const { data, error } = await supabase
    .from("products_with_global_images")
    .select(
      "id, vendor_id, category_id, name, description, price, image_url, display_image_url, barcode, stock_quantity, is_active",
    )
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .or(`name.ilike.%${term}%,barcode.ilike.%${term}%`)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueryProduct[]).map(mapProduct);
}

export async function loadActiveVendors() {
  const { data, error } = await supabase
    .from("vendors")
    .select(
      `
      id,
      name,
      vendor_type,
       is_active,
       approval_status,
       lat,
       lng,
       delivery_radius_km,
       completed_orders,
       vendor_operating_hours (
       day_of_week,
       opens_at,
       closes_at,
       is_closed
      )
    `,
    )
    .eq("approval_status", "approved")
    .eq("is_active", true);

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueryVendor[]).map(mapVendor);
}

export function useCustomerVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setVendors(await loadActiveVendors());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "تعذر تحميل الصيدليات.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    vendors,
    loading,
    error,
    reload,
  };
}

export async function loadVendorProducts(vendorId: string): Promise<Product[]> {
  if (!vendorId) {
    return [];
  }

  const { data, error } = await supabase
    .from("products_with_global_images")
    .select(
      "id, vendor_id, category_id, name, description, price, image_url, display_image_url, barcode, stock_quantity, is_active",
    )
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueryProduct[]).map(mapProduct);
}

export async function loadCategoryProducts(
  categoryIds: string[],
  pharmacyId?: string | null,
): Promise<Product[]> {
  if (categoryIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("products_with_global_images")
    .select(
      "id, vendor_id, category_id, name, description, price, image_url, display_image_url, barcode, stock_quantity, is_active",
    )
    .eq("is_active", true)
    .gt("stock_quantity", 0)
    .in("category_id", categoryIds)
    .order("created_at", { ascending: false });

  if (pharmacyId) {
    query = query.eq("vendor_id", pharmacyId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueryProduct[]).map(mapProduct);
}

export function useCustomerCatalogData() {
  const [data, setData] = useState<CustomerCatalogData>(getEmptyCatalogData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setData(getEmptyCatalogData());
      setLoading(false);
      setError("إعدادات Supabase غير مكتملة في تطبيق الزبون.");
      return;
    }

    setLoading(true);
    setError(null);
    setData(getEmptyCatalogData());

    try {
      setData(await loadCustomerCatalogData());
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "تعذر تحميل بيانات المتجر الآن.",
      );
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

export function getFeaturedProducts(groupedProducts: GroupedProduct[]) {
  return groupedProducts.slice(0, 4);
}

export function getPopularProducts(products: Product[]) {
  return [...products].sort(
    (left, right) => right.stock_quantity - left.stock_quantity,
  );
}

export function getPrimaryAddress(
  addresses: Address[],
  defaultAddressId?: string | null,
) {
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

export function hasSavedAddressCoordinates(
  address: Pick<Address, "lat" | "lng">,
) {
  return typeof address.lat === "number" && typeof address.lng === "number";
}

function readCoordinate(value?: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function calculateDistanceKm(
  from: Pick<Address, "lat" | "lng"> | null | undefined,
  to: Pick<Vendor, "lat" | "lng"> | null | undefined,
) {
  const fromLat = readCoordinate(from?.lat ?? null);
  const fromLng = readCoordinate(from?.lng ?? null);
  const toLat = readCoordinate(to?.lat ?? null);
  const toLng = readCoordinate(to?.lng ?? null);

  if (
    fromLat === null ||
    fromLng === null ||
    toLat === null ||
    toLng === null
  ) {
    return null;
  }

  const earthRadiusKm = 6371;
  const latDistance = ((toLat - fromLat) * Math.PI) / 180;
  const lngDistance = ((toLng - fromLng) * Math.PI) / 180;

  const a =
    Math.sin(latDistance / 2) * Math.sin(latDistance / 2) +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(lngDistance / 2) *
      Math.sin(lngDistance / 2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistanceKm(distanceKm: number | null) {
  if (distanceKm === null) {
    return "المسافة غير متاحة";
  }

  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)} م`;
  }

  return `${distanceKm.toFixed(1)} كم`;
}

export function isVendorWithinDeliveryRadius(
  address: Pick<Address, "lat" | "lng"> | null | undefined,
  vendor: Pick<Vendor, "lat" | "lng" | "delivery_radius_km"> | null | undefined,
) {
  const distanceKm = calculateDistanceKm(address, vendor);

  if (distanceKm === null) {
    return true;
  }

  return distanceKm <= Number(vendor?.delivery_radius_km ?? 15);
}

export function getCategoryById(
  categories: Category[],
  categoryId?: string | null,
) {
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

export function getCategoryLabel(category: Pick<Category, "name" | "name_ar">) {
  return category.name_ar?.trim() || category.name.trim();
}

function getCategorySortOrder(category: Category) {
  return Number(category.sort_order ?? 0);
}

function toPharmacySubcategory(category: Category): PharmacySubcategory {
  return {
    id: category.id,
    label: getCategoryDisplayLabel(category),
    icon: category.icon || getCategoryIcon(category.slug),
    imageUrl: category.image_url ?? getCategoryFallbackImage(category.slug),
    sortOrder: getCategorySortOrder(category),
    category,
  };
}

function toPharmacyParentCategory(
  category: Category,
  childCategoriesByParentId: Map<string, Category[]>,
): PharmacyParentCategory {
  return {
    id: category.id,
    label: getCategoryDisplayLabel(category),
    icon: category.icon || getCategoryIcon(category.slug),
    imageUrl: category.image_url ?? getCategoryFallbackImage(category.slug),
    sortOrder: getCategorySortOrder(category),
    category,
    subcategories: (childCategoriesByParentId.get(category.id) ?? []).map(
      toPharmacySubcategory,
    ),
  };
}

function sortCategoriesByDisplayOrder(left: Category, right: Category) {
  return (
    getCategorySortOrder(left) - getCategorySortOrder(right) ||
    getCategoryLabel(left).localeCompare(getCategoryLabel(right), "ar")
  );
}

function isActiveCategory(category: Category) {
  return category.is_active !== false;
}

function buildCategoryAndDescendantIds(
  categoryId: string,
  childCategoriesByParentId: Map<string, Category[]>,
) {
  const ids = new Set<string>([categoryId]);
  const stack = [...(childCategoriesByParentId.get(categoryId) ?? [])];

  while (stack.length > 0) {
    const category = stack.pop();

    if (!category || ids.has(category.id)) {
      continue;
    }

    ids.add(category.id);
    stack.push(...(childCategoriesByParentId.get(category.id) ?? []));
  }

  return ids;
}

export function buildPharmacyCategoryTree(
  categories: Category[],
): PharmacyCategoryTree {
  const activeCategories = categories
    .filter(isActiveCategory)
    .sort(sortCategoriesByDisplayOrder);
  const categoryById = new Map(
    activeCategories.map((category) => [category.id, category]),
  );
  const childCategoriesByParentId = new Map<string, Category[]>();

  for (const category of activeCategories) {
    if (!category.parent_id || !categoryById.has(category.parent_id)) {
      continue;
    }

    const children = childCategoriesByParentId.get(category.parent_id) ?? [];
    children.push(category);
    childCategoriesByParentId.set(category.parent_id, children);
  }

  for (const children of childCategoriesByParentId.values()) {
    children.sort(sortCategoriesByDisplayOrder);
  }

  const parentCategories = activeCategories.filter(
    (category) => !category.parent_id,
  );
  const categoryAndDescendantIdsById = new Map<string, Set<string>>();

  for (const category of activeCategories) {
    categoryAndDescendantIdsById.set(
      category.id,
      buildCategoryAndDescendantIds(category.id, childCategoriesByParentId),
    );
  }

  return {
    parents: parentCategories.map((category) =>
      toPharmacyParentCategory(category, childCategoriesByParentId),
    ),
    categoryById,
    childCategoriesByParentId,
    categoryAndDescendantIdsById,
  };
}

export function getParentCategories(categories: Category[]) {
  return buildPharmacyCategoryTree(categories).parents.map(
    (parentCategory) => parentCategory.category,
  );
}

export function getSubcategoriesForParent(
  categories: Category[],
  parentCategoryId?: string | null,
) {
  if (!parentCategoryId) {
    return [];
  }

  return (
    buildPharmacyCategoryTree(categories).childCategoriesByParentId.get(
      parentCategoryId,
    ) ?? []
  );
}

export function getPharmacyParentCategoryById(
  categories: Category[],
  categoryId?: string | null,
) {
  if (!categoryId) {
    return null;
  }

  const tree = buildPharmacyCategoryTree(categories);
  const category = tree.categoryById.get(categoryId) ?? null;

  if (!category) {
    return null;
  }

  const parentCategory = category.parent_id
    ? tree.categoryById.get(category.parent_id)
    : category;

  return parentCategory
    ? toPharmacyParentCategory(parentCategory, tree.childCategoriesByParentId)
    : null;
}

export function getPharmacySubcategoryById(
  parentCategory: PharmacyParentCategory,
  subcategoryId?: string | null,
) {
  if (!subcategoryId) {
    return null;
  }

  return (
    parentCategory.subcategories.find(
      (subcategory) => subcategory.id === subcategoryId,
    ) ?? null
  );
}

export function getCategoryDisplayLabel(
  category: Pick<Category, "name" | "name_ar" | "slug">,
) {
  const slug = normalizeSlug(category.slug);

  if (slug.endsWith("-other")) {
    return "منتجات أخرى";
  }

  return getCategoryLabel(category);
}

export function getProductCategoryBadgeLabel(
  categories: Category[],
  categoryId?: string | null,
) {
  const category = getCategoryById(categories, categoryId);

  if (!category) {
    return "";
  }

  return getCategoryDisplayLabel(category);
}

export function getCategoryPathLabel(
  categories: Category[],
  categoryId?: string | null,
) {
  const category = getCategoryById(categories, categoryId);

  if (!category) {
    return "";
  }

  if (!category.parent_id) {
    return getCategoryDisplayLabel(category);
  }

  const parentCategory = getCategoryById(categories, category.parent_id);

  return parentCategory
    ? `${getCategoryDisplayLabel(parentCategory)} ← ${getCategoryDisplayLabel(category)}`
    : getCategoryDisplayLabel(category);
}

export function productMatchesPharmacyParentCategory(
  product: Product,
  categories: Category[],
  parentCategory: PharmacyParentCategory,
) {
  const tree = buildPharmacyCategoryTree(categories);
  const categoryIds =
    tree.categoryAndDescendantIdsById.get(parentCategory.id) ??
    new Set([parentCategory.id]);

  return categoryIds.has(product.category_id);
}

export function productMatchesPharmacySubcategory(
  product: Product,
  categories: Category[],
  subcategory: PharmacySubcategory,
) {
  void categories;
  return product.category_id === subcategory.id;
}

export function getProductsForPharmacyParentCategory(
  products: Product[],
  categories: Category[],
  parentCategoryId?: string | null,
  subcategoryId?: string | null,
) {
  const parentCategory = getPharmacyParentCategoryById(
    categories,
    parentCategoryId,
  );

  if (!parentCategory) {
    return [];
  }

  const tree = buildPharmacyCategoryTree(categories);
  const categoryIds =
    tree.categoryAndDescendantIdsById.get(parentCategory.id) ??
    new Set([parentCategory.id]);
  const parentProducts = products.filter((product) =>
    categoryIds.has(product.category_id),
  );
  const subcategory = getPharmacySubcategoryById(parentCategory, subcategoryId);

  if (!subcategory) {
    return parentProducts;
  }

  return parentProducts.filter((product) =>
    productMatchesPharmacySubcategory(product, categories, subcategory),
  );
}

export function getPharmacyParentCategoriesForProducts(
  products: Product[],
  categories: Category[],
) {
  const tree = buildPharmacyCategoryTree(categories);

  return tree.parents.filter((parentCategory) => {
    const categoryIds =
      tree.categoryAndDescendantIdsById.get(parentCategory.id) ??
      new Set([parentCategory.id]);

    return products.some((product) => categoryIds.has(product.category_id));
  });
}

export function getPharmacyCategoryProductCount(
  products: Product[],
  categories: Category[],
  parentCategoryId: string,
) {
  return getProductsForPharmacyParentCategory(
    products,
    categories,
    parentCategoryId,
  ).length;
}

export function getPharmacyCategoryImage(
  products: Product[],
  categories: Category[],
  parentCategoryId: string,
) {
  const category = getCategoryById(categories, parentCategoryId);
  return (
    category?.image_url ??
    getProductsForPharmacyParentCategory(
      products,
      categories,
      parentCategoryId,
    ).find((product) => product.image_url)?.image_url ??
    getCategoryFallbackImage(category?.slug)
  );
}

export function filterProducts(
  products: Product[],
  input: {
    categories?: Category[];
    categoryId?: string | null;
    query?: string | null;
  },
) {
  const normalizedQuery = normalizeQuery(input.query ?? "");
  const categoryIds =
    input.categoryId && input.categories
      ? (buildPharmacyCategoryTree(
          input.categories,
        ).categoryAndDescendantIdsById.get(input.categoryId) ??
        new Set([input.categoryId]))
      : input.categoryId
        ? new Set([input.categoryId])
        : null;

  return products.filter((product) => {
    const matchesCategory =
      !categoryIds || categoryIds.has(product.category_id);
    const matchesQuery =
      !normalizedQuery ||
      normalizeQuery(product.name).includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function filterGroupedProducts(
  groupedProducts: GroupedProduct[],
  input: {
    categories?: Category[];
    categoryId?: string | null;
    query?: string | null;
  },
) {
  const normalizedQuery = normalizeQuery(input.query ?? "");

  const categoryIds =
    input.categoryId && input.categories
      ? (buildPharmacyCategoryTree(
          input.categories,
        ).categoryAndDescendantIdsById.get(input.categoryId) ??
        new Set([input.categoryId]))
      : input.categoryId
        ? new Set([input.categoryId])
        : null;

  return groupedProducts.filter((product) => {
    const matchesCategory =
      !categoryIds || categoryIds.has(product.category_id);

    const matchesQuery =
      !normalizedQuery ||
      normalizeQuery(product.name).includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function getGroupedProductById(
  groupedProducts: GroupedProduct[],
  groupId?: string | null,
) {
  if (!groupId) {
    return null;
  }

  return groupedProducts.find((product) => product.id === groupId) ?? null;
}

export function useFilteredProducts(input: {
  categoryId?: string | null;
  query?: string | null;
}) {
  const { data } = useCustomerCatalogData();

  return useMemo(
    () =>
      filterProducts(data.products, { ...input, categories: data.categories }),
    [data.categories, data.products, input],
  );
}

export function useGroupedCustomerProducts() {
  const catalog = useCustomerCatalogData();

  const groupedProducts = useMemo(
    () =>
      groupProductsByMarketplaceListing(
        catalog.data.products,
        catalog.data.vendors,
      ),
    [catalog.data.products, catalog.data.vendors],
  );

  return {
    ...catalog,
    groupedProducts,
  };
}

export async function listFavouriteVendorIds() {
  const customerIdResult = await supabase.rpc("get_customer_id");

  if (customerIdResult.error) {
    throw customerIdResult.error;
  }

  const customerId = customerIdResult.data;

  if (!customerId) {
    return [];
  }

  const { data, error } = await supabase
    .from("customer_favorite_vendors")
    .select("vendor_id")
    .eq("customer_id", customerId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((item) => item.vendor_id as string);
}

export async function isFavouriteVendor(vendorId: string) {
  const favouriteVendorIds = await listFavouriteVendorIds();
  return favouriteVendorIds.includes(vendorId);
}

export async function toggleFavouriteVendor(vendorId: string) {
  const customerIdResult = await supabase.rpc("get_customer_id");

  if (customerIdResult.error) {
    throw customerIdResult.error;
  }

  const customerId = customerIdResult.data;

  if (!customerId) {
    throw new Error("Customer not found.");
  }

  const { data: existing, error: existingError } = await supabase
    .from("customer_favorite_vendors")
    .select("id")
    .eq("customer_id", customerId)
    .eq("vendor_id", vendorId)
    .maybeSingle();

  if (existingError) {
    throw existingError;
  }

  if (existing) {
    const { error } = await supabase
      .from("customer_favorite_vendors")
      .delete()
      .eq("id", existing.id);

    if (error) {
      throw error;
    }

    return false;
  }

  const { error } = await supabase.from("customer_favorite_vendors").insert({
    customer_id: customerId,
    vendor_id: vendorId,
  });

  if (error) {
    throw error;
  }

  return true;
}
