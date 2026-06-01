import { formatOrderStatusLabel as formatSharedOrderStatusLabel, formatPaymentStatusLabel as formatSharedPaymentStatusLabel } from "@medifast/i18n";
import { formatCurrencyLYD } from "@medifast/types";
import { supabase } from "../../lib/supabase";

export type CustomerOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type CustomerOrder = {
  id: string;
  vendorName: string;
  deliveryAddress: string;
  total: number;
  deliveryFee: number;
  deliveryDistanceKm: number | null;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  deliveredAt: string | null;
  driverName: string | null;
  driverPhone: string | null;
  driverVehicleType: string | null;
  driverLat: number | null;
  driverLng: number | null;
  items: CustomerOrderItem[];
};

const statusLabelMap: Record<string, string> = {
  placed: "تم الطلب",
  pending: "قيد الانتظار",
  accepted: "تم القبول",
  rejected: "مرفوض",
  preparing: "قيد التحضير",
  ready_for_pickup: "جاهز للاستلام",
  assigned: "تم التعيين",
  arrived_at_pharmacy: "وصل السائق إلى الصيدلية",
  picked_up: "تم استلام الطلب",
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  collected: "تم التحصيل",
};

type SingleRecord<T extends Record<string, unknown>> = T | T[] | null | undefined;

type CustomerOrderQueryRow = {
  id: unknown;
  total?: unknown;
  delivery_fee?: unknown;
  delivery_distance_km?: unknown;
  payment_method?: unknown;
  payment_status?: unknown;
  order_status?: unknown;
  created_at?: unknown;
  delivered_at?: unknown;
  vendor?: SingleRecord<{ name?: string }>;
  address?: SingleRecord<{ line_1?: string; lat?: number | null; lng?: number | null }>;
  driver?: SingleRecord<{
  vehicle_type?: string | null;
  current_lat?: number | string | null;
  current_lng?: number | string | null;
  profile?: SingleRecord<{
    full_name?: string;
    phone?: string | null;
  }>;
}>;
  items?: Array<{
    id: unknown;
    quantity?: unknown;
    unit_price?: unknown;
    total_price?: unknown;
    product?: SingleRecord<{ name?: string }>;
  }> | null;
};

export const customerOrderTimeline = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "arrived_at_pharmacy",
  "picked_up",
  "on_the_way",
  "delivered",
] as const;

function readSingle<T extends Record<string, unknown>>(value: SingleRecord<T>) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readName(value: SingleRecord<{ full_name?: string }>, fallback: string) {
  return readSingle(value)?.full_name ?? fallback;
}

function readVendorName(value: SingleRecord<{ name?: string }>, fallback: string) {
  return readSingle(value)?.name ?? fallback;
}

function readProductName(value: SingleRecord<{ name?: string }>, fallback: string) {
  return readSingle(value)?.name ?? fallback;
}

function readOptionalNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatAddress(
  value: SingleRecord<{ line_1?: string; lat?: number | null; lng?: number | null }>
) {
  const address = readSingle(value);

  if (!address) {
    return "العنوان غير متاح";
  }

  return address.line_1 || "العنوان غير متاح";
}

function mapOrder(order: CustomerOrderQueryRow): CustomerOrder {
  const items = Array.isArray(order.items) ? order.items : [];
  const driver = readSingle(order.driver);
  const driverProfile = readSingle(driver?.profile);

  return {
    id: String(order.id),
    vendorName: readVendorName(order.vendor, "المتجر"),
    deliveryAddress: formatAddress(order.address),
    total: Number(order.total ?? 0),
    deliveryFee: Number(order.delivery_fee ?? 0),
    deliveryDistanceKm: readOptionalNumber(order.delivery_distance_km),
    paymentMethod: String(order.payment_method ?? ""),
    paymentStatus: String(order.payment_status ?? ""),
    orderStatus: String(order.order_status ?? ""),
    createdAt: String(order.created_at ?? ""),
    deliveredAt: order.delivered_at ? String(order.delivered_at) : null,
    driverName:
  driverProfile?.full_name?.trim()
    ? driverProfile.full_name
    : null,

driverPhone:
  driverProfile?.phone?.trim()
    ? driverProfile.phone
    : null,

driverVehicleType:
  driver?.vehicle_type?.trim()
    ? driver.vehicle_type
    : null,
    driverLat: readOptionalNumber(driver?.current_lat),
    driverLng: readOptionalNumber(driver?.current_lng),
    
    items: items.map((item) => ({
      id: String(item.id),
      productName: readProductName(item.product, "المنتج"),
      quantity: Number(item.quantity ?? 0),
      unitPrice: Number(item.unit_price ?? 0),
      totalPrice: Number(item.total_price ?? 0),
    })),
  };
}

export function normalizeCustomerOrderError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تحميل الطلبات الآن.";
}

export function formatCustomerCurrency(value: number) {
  return formatCurrencyLYD(value);
}

export function formatCustomerDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatOrderStatusLabel(value: string) {
  return statusLabelMap[value] ?? formatSharedOrderStatusLabel(value);
}

export function formatCustomerPaymentStatusLabel(paymentStatus: string, paymentMethod: string) {
  return formatSharedPaymentStatusLabel(paymentStatus, paymentMethod);
}
export function orderStatusTone(status: string): "neutral" | "warning" | "success" | "danger" | "info" {
  if (status === "delivered" || status === "accepted" || status === "collected") {
    return "success";
  }

  if (status === "on_the_way" || status === "assigned" || status === "ready_for_pickup") {
    return "info";
  }

  if (status === "rejected" || status === "cancelled") {
    return "danger";
  }

  if (status === "placed" || status === "preparing" || status === "pending") {
    return "warning";
  }

  return "neutral";
}
export function isActiveCustomerOrder(order: CustomerOrder) {
  return !["delivered", "cancelled", "rejected"].includes(order.orderStatus);
}

export function getTimelineStepState(
  orderStatus: string,
  step: (typeof customerOrderTimeline)[number]
) {
  if (orderStatus === "pending") {
    return step === "placed" ? "current" : "upcoming";
  }

  if (orderStatus === "rejected" || orderStatus === "cancelled") {
    return "upcoming";
  }

  const currentIndex = customerOrderTimeline.indexOf(
    orderStatus as (typeof customerOrderTimeline)[number]
  );

  const stepIndex = customerOrderTimeline.indexOf(step);

  if (currentIndex === -1) {
    return "upcoming";
  }

  if (stepIndex < currentIndex) {
    return "completed";
  }

  if (stepIndex === currentIndex) {
    return "current";
  }

  return "upcoming";
}

export function getDeliveryHeadline(order: CustomerOrder) {
  if (order.orderStatus === "placed" || order.orderStatus === "pending") {
    return {
      tone: "muted" as const,
      message: "تم استلام طلبك، وفي انتظار قبول الصيدلية.",
    };
  }

  if (order.orderStatus === "accepted") {
    return {
      tone: "info" as const,
      message: "قبلت الصيدلية الطلب وسيبدأ التحضير قريبًا.",
    };
  }

  if (order.orderStatus === "preparing") {
    return {
      tone: "info" as const,
      message: "الصيدلية تقوم بتحضير طلبك الآن.",
    };
  }

  if (order.orderStatus === "ready_for_pickup") {
    return {
      tone: "info" as const,
      message: "طلبك جاهز للاستلام، وفي انتظار تعيين السائق.",
    };
  }

  if (order.orderStatus === "assigned") {
    return {
      tone: "info" as const,
      message: order.driverName
        ? `تم تعيين السائق ${order.driverName} لاستلام طلبك.`
        : "تم تعيين سائق لاستلام طلبك.",
    };
  }

  if (order.orderStatus === "arrived_at_pharmacy") {
    return {
      tone: "info" as const,
      message: order.driverName
        ? `وصل السائق ${order.driverName} إلى الصيدلية.`
        : "وصل السائق إلى الصيدلية.",
    };
  }

  if (order.orderStatus === "picked_up") {
    return {
      tone: "info" as const,
      message: order.driverName
        ? `استلم السائق ${order.driverName} طلبك من الصيدلية.`
        : "تم استلام طلبك من الصيدلية.",
    };
  }

  if (order.orderStatus === "on_the_way") {
    return {
      tone: "info" as const,
      message: order.driverName
        ? `طلبك في الطريق مع ${order.driverName}.`
        : "طلبك في الطريق إليك الآن.",
    };
  }

  if (order.orderStatus === "delivered") {
    return {
      tone: "success" as const,
      message: "تم توصيل طلبك بنجاح.",
    };
  }

  if (order.orderStatus === "rejected") {
    return {
      tone: "danger" as const,
      message: "تم رفض هذا الطلب. يمكنك مراجعة المتجر أو إنشاء طلب جديد.",
    };
  }

  if (order.orderStatus === "cancelled") {
    return {
      tone: "danger" as const,
      message: "تم إلغاء هذا الطلب ولم يعد نشطًا.",
    };
  }

  return {
    tone: "muted" as const,
    message: "سيتم تحديث حالة الطلب هنا تلقائيًا.",
  };
}

export async function getCurrentCustomerId() {
  const { data: customerId, error } = await supabase.rpc("get_customer_id");

  if (error) {
    throw error;
  }

  if (!customerId) {
    throw new Error("حساب العميل غير مرتبط بشكل صحيح.");
  }

  return String(customerId);
}

export async function loadCurrentCustomerOrders() {
  const customerId = await getCurrentCustomerId();
  const orders = await listCustomerOrders(customerId);

  return {
    customerId,
    orders,
  };
}

export async function loadCurrentCustomerOrder(orderId: string) {
  const customerId = await getCurrentCustomerId();
  const order = await getCustomerOrder(customerId, orderId);

  return {
    customerId,
    order,
  };
}

const CUSTOMER_ORDER_LIST_SELECT = `
  id,
  total,
  delivery_fee,
  payment_method,
  payment_status,
  order_status,
  created_at,
  delivered_at,
  vendor:vendors(name),
  address:addresses!orders_delivery_address_id_fkey(
    line_1
  ),
  items:order_items(
    id,
    quantity,
    total_price,
    product:products!order_items_product_id_fkey(name)
  )
`;

const CUSTOMER_ORDER_SELECT = `
  id,
  total,
  delivery_fee,
  delivery_distance_km,
  payment_method,
  payment_status,
  order_status,
  created_at,
  delivered_at,
  vendor:vendors(name),
  address:addresses!orders_delivery_address_id_fkey(
    line_1,
    lat,
    lng
  ),
  driver:drivers(
  vehicle_type,
  current_lat,
  current_lng,
  profile:profiles!drivers_user_id_fkey(
    full_name,
    phone
  )
),
  items:order_items(
    id,
    quantity,
    unit_price,
    total_price,
    product:products!order_items_product_id_fkey(name)
  )
`;
export async function listCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(CUSTOMER_ORDER_LIST_SELECT)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as CustomerOrderQueryRow[]).map((order) => mapOrder(order));
}

export async function getCustomerOrder(customerId: string, orderId: string): Promise<CustomerOrder | null> {
  const { data, error } = await supabase

    .from("orders")
    .select(CUSTOMER_ORDER_SELECT)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapOrder(data as CustomerOrderQueryRow) : null;
}
