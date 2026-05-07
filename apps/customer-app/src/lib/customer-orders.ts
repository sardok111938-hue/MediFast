import { formatOrderStatusLabel as formatSharedOrderStatusLabel, formatPaymentStatusLabel as formatSharedPaymentStatusLabel } from "@medifast/i18n";
import { supabase } from "./supabase";

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
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  driverName: string | null;
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
  on_the_way: "في الطريق",
  delivered: "تم التوصيل",
  cancelled: "ملغي",
  collected: "تم التحصيل",
};

type SingleRecord<T extends Record<string, unknown>> = T | T[] | null | undefined;

type CustomerOrderQueryRow = {
  id: unknown;
  total?: unknown;
  payment_method?: unknown;
  payment_status?: unknown;
  order_status?: unknown;
  created_at?: unknown;
  vendor?: SingleRecord<{ name?: string }>;
  address?: SingleRecord<{ label?: string; line_1?: string; line_2?: string | null; city?: string; area?: string | null }>;
  driver?: SingleRecord<{ profile?: SingleRecord<{ full_name?: string }> }>;
  items?: Array<{
    id: unknown;
    quantity?: unknown;
    unit_price?: unknown;
    total_price?: unknown;
    product?: SingleRecord<{ name?: string }>;
  }> | null;
};

export const customerOrderTimeline = ["placed", "accepted", "preparing", "ready_for_pickup", "on_the_way", "delivered"] as const;

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

function formatAddress(value: SingleRecord<{ label?: string; line_1?: string; line_2?: string | null; city?: string; area?: string | null }>) {
  const address = readSingle(value);
  if (!address) {
    return "العنوان غير متاح";
  }

  return [address.label, address.line_1, address.line_2, address.area, address.city].filter(Boolean).join("، ") || "العنوان غير متاح";
}

function mapOrder(order: CustomerOrderQueryRow): CustomerOrder {
  const items = Array.isArray(order.items) ? order.items : [];

  return {
    id: String(order.id),
    vendorName: readVendorName(order.vendor, "المتجر"),
    deliveryAddress: formatAddress(order.address),
    total: Number(order.total ?? 0),
    paymentMethod: String(order.payment_method ?? ""),
    paymentStatus: String(order.payment_status ?? ""),
    orderStatus: String(order.order_status ?? ""),
    createdAt: String(order.created_at ?? ""),
    driverName: readName(readSingle(order.driver)?.profile, "السائق") === "السائق" ? null : readName(readSingle(order.driver)?.profile, "السائق"),
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
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "SAR",
  }).format(value);
}

export function formatCustomerDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
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

export function getTimelineStepState(orderStatus: string, step: (typeof customerOrderTimeline)[number]) {
  if (orderStatus === "pending") {
    return step === "placed" ? "current" : "upcoming";
  }

  if (orderStatus === "rejected" || orderStatus === "cancelled") {
    return "upcoming";
  }

  if (step === "preparing") {
    if (orderStatus === "accepted") {
      return "current";
    }

    const progressedPastPreparing = ["ready_for_pickup", "assigned", "on_the_way", "delivered"].includes(orderStatus);
    return progressedPastPreparing ? "completed" : "upcoming";
  }

  const normalizedOrderStatus = orderStatus === "assigned" ? "ready_for_pickup" : orderStatus;
  const currentIndex = customerOrderTimeline.indexOf(normalizedOrderStatus as (typeof customerOrderTimeline)[number]);
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
  if (order.orderStatus === "on_the_way") {
    return {
      tone: "info" as const,
      message: order.driverName ? `طلبك في الطريق مع ${order.driverName}.` : "طلبك في الطريق إليك الآن.",
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

  if (order.driverName) {
    return {
      tone: "muted" as const,
      message: `تم تعيين السائق ${order.driverName} لهذا الطلب.`,
    };
  }

  return {
    tone: "muted" as const,
    message: "سيظهر اسم السائق هنا بمجرد تعيينه لطلبك.",
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

export async function listCustomerOrders(customerId: string): Promise<CustomerOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(name),
      address:addresses(
        label,
        line_1,
        line_2,
        city,
        area
      ),
      driver:drivers(
        profile:profiles!drivers_user_id_fkey(full_name)
      ),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
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
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(name),
      address:addresses(
        label,
        line_1,
        line_2,
        city,
        area
      ),
      driver:drivers(
        profile:profiles!drivers_user_id_fkey(full_name)
      ),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .eq("id", orderId)
    .eq("customer_id", customerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapOrder(data as CustomerOrderQueryRow) : null;
}
