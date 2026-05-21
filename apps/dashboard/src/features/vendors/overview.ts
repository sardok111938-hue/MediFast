import { getSupabaseServerClient } from "../../lib/supabase/server";

type VendorOverviewOrderRow = {
  id: string;
  total: number;
  payment_status: string;
  payment_method: string;
  order_status: string;
  created_at: string;
  customer_name: string;
  address: string;
};

type VendorOverviewProductRow = {
  id: string;
  name: string;
  price: number;
  stock_quantity: number;
  is_active: boolean;
};

export type VendorOverviewData = {
  hasVendor: boolean;
  vendorName: string;
  imageUrl: string | null;
  description: string | null;
  address: string;
  approvalStatus: string | null;
  isActive: boolean;
  orderCounts: {
    today: number;
    placed: number;
    preparing: number;
    readyForPickup: number;
    delivered: number;
    codPending: number;
    averageOrderValue: number;
    codCollected: number;
  };
  productCounts: {
  active: number;
  inactive: number;
  lowStock: number;
  outOfStock: number;
  catalogValue: number;
};
  recentOrders: VendorOverviewOrderRow[];
  stockAlerts: VendorOverviewProductRow[];
};

function readSingle<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function isToday(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return date >= startOfToday;
}

function buildAddress(address: { line_1?: string | null; lat?: number | string | null; lng?: number | string | null } | null) {
  return address?.line_1 || "عنوان التوصيل غير متاح";
}

function buildVendorAddress(vendor: { address_line_1?: string | null; area?: string | null; city?: string | null } | null) {
  return [vendor?.address_line_1, vendor?.area, vendor?.city].filter(Boolean).join("، ");
}

export async function getVendorOverviewData(): Promise<VendorOverviewData> {
  const supabase = await getSupabaseServerClient();

  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    return {
      hasVendor: false,
      vendorName: "المتجر",
      imageUrl: null,
      description: null,
      address: "",
      approvalStatus: null,
      isActive: false,
      orderCounts: {
        today: 0,
        placed: 0,
        preparing: 0,
        readyForPickup: 0,
        delivered: 0,
        codPending: 0,
        averageOrderValue: 0,
        codCollected: 0,
      },
      productCounts: {
        active: 0,
        inactive: 0,
        lowStock: 0,
        outOfStock: 0,
        catalogValue: 0,
      },
      recentOrders: [],
      stockAlerts: [],
    };
  }

  const [
    { data: vendorData, error: vendorProfileError },
    { data: ordersData, error: ordersError },
    { data: productsData, error: productsError },
  ] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, description, address_line_1, area, city, image_url, approval_status, is_active")
      .eq("id", vendorId)
      .maybeSingle(),
    supabase
      .from("orders")
      .select(`
        id,
        total,
        payment_status,
        payment_method,
        order_status,
        created_at,
        customer:customers(
          profile:profiles(full_name)
        ),
        address:addresses(
  line_1,
  lat,
  lng
)
      `)
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select("id, name, price, stock_quantity, is_active")
      .eq("vendor_id", vendorId)
      .order("created_at", { ascending: false }),
  ]);

  if (vendorProfileError) {
    throw vendorProfileError;
  }

  if (ordersError) {
    throw ordersError;
  }

  if (productsError) {
    throw productsError;
  }

  const recentOrders = (ordersData ?? []).map((order) => ({
    id: String(order.id),
    total: Number(order.total ?? 0),
    payment_status: String(order.payment_status ?? ""),
    payment_method: String(order.payment_method ?? ""),
    order_status: String(order.order_status ?? ""),
    created_at: String(order.created_at ?? ""),
    customer_name: String(
      readSingle((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile)?.full_name ?? "Customer"
    ),
    address: buildAddress(
  readSingle(
    order.address as
      | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }
      | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }[]
      | null
  )
),
  }));

  const products = (productsData ?? []).map((product) => ({
  id: String(product.id),
  name: String(product.name ?? ""),
  price: Number(product.price ?? 0),
  stock_quantity: Number(product.stock_quantity ?? 0),
  is_active: Boolean(product.is_active),
}));
const deliveredOrders = recentOrders.filter(
  (order) => order.order_status === "delivered"
);
  return {
    hasVendor: true,
    vendorName: String(vendorData?.name ?? "صيدلية"),
    imageUrl: vendorData?.image_url ? String(vendorData.image_url) : null,
    description: vendorData?.description ? String(vendorData.description) : null,
    address: buildVendorAddress(vendorData) || "لم يتم ضبط عنوان المتجر بعد",
    approvalStatus: vendorData?.approval_status ? String(vendorData.approval_status) : null,
    isActive: Boolean(vendorData?.is_active),
    orderCounts: {
      today: recentOrders.filter((order) => isToday(order.created_at)).length,
      placed: recentOrders.filter((order) => order.order_status === "placed" || order.order_status === "pending").length,
      preparing: recentOrders.filter((order) => order.order_status === "preparing").length,
      readyForPickup: recentOrders.filter((order) => order.order_status === "ready_for_pickup").length,
      delivered: recentOrders.filter((order) => order.order_status === "delivered").length,
      codPending: recentOrders.filter((order) => order.payment_method === "cash_on_delivery" && order.payment_status === "pending").length,
      averageOrderValue: deliveredOrders.length > 0
  ? deliveredOrders.reduce((total, order) => total + order.total, 0) / deliveredOrders.length
  : 0,      codCollected: recentOrders.filter((order) => order.payment_method === "cash_on_delivery" && order.payment_status === "collected").length,
    },
    productCounts: {
      active: products.filter((product) => product.is_active).length,
      inactive: products.filter((product) => !product.is_active).length,
      lowStock: products.filter((product) => product.is_active && product.stock_quantity > 0 && product.stock_quantity <= 10).length,
      outOfStock: products.filter((product) => product.is_active && product.stock_quantity <= 0).length,
      catalogValue: products
  .filter((product) => product.is_active)
  .reduce((total, product) => total + product.price * product.stock_quantity, 0),
    },
    recentOrders: recentOrders.slice(0, 6),
    stockAlerts: products.filter((product) => product.is_active && product.stock_quantity <= 10).slice(0, 6),
  };
}
