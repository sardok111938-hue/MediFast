import { formatOrderStatusLabel, formatPaymentStatusLabel } from "@medifast/i18n";
import { getActiveSession, getAuthenticatedUser, supabase } from "./supabase";

export type DriverProfile = {
  driverId: string;
  fullName: string;
  isAvailable: boolean;
  approvalStatus: string;
};

export type DriverOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type DriverOrder = {
  id: string;
  customerName: string;
  vendorName: string;
  pickupAddress: string;
  dropoffAddress: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: DriverOrderItem[];
};

type DriverOrderQueryRow = {
  id: unknown;
  total?: unknown;
  payment_method?: unknown;
  payment_status?: unknown;
  order_status?: unknown;
  created_at?: unknown;
  vendor?: SingleRecord<{ name?: string; address_line_1?: string; address_line_2?: string | null; city?: string; area?: string | null }>;
  customer?: SingleRecord<{ profile?: SingleRecord<{ full_name?: string }> }>;
  address?: SingleRecord<{ line_1?: string; line_2?: string | null; city?: string; area?: string | null }>;
  items?: Array<{
    id: unknown;
    quantity?: unknown;
    unit_price?: unknown;
    total_price?: unknown;
    product?: SingleRecord<{ name?: string }>;
  }> | null;
};

type SingleRecord<T extends Record<string, unknown>> = T | T[] | null | undefined;

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

function formatAddress(
  value: SingleRecord<{
    line_1?: string;
    line_2?: string | null;
    city?: string;
    area?: string | null;
    address_line_1?: string;
    address_line_2?: string | null;
  }>
) {
  const address = readSingle(value);
  if (!address) {
    return "العنوان غير متاح";
  }

  return [
    address.line_1 ?? address.address_line_1,
    address.line_2 ?? address.address_line_2,
    address.area,
    address.city,
  ]
    .filter(Boolean)
    .join("، ") || "العنوان غير متاح";
}

function readCustomerName(value: SingleRecord<{ profile?: SingleRecord<{ full_name?: string }> }>, fallback: string) {
  return readName(readSingle(value)?.profile, fallback);
}

export function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "حدث خطأ ما.";
}

export function formatCurrency(value: number) {
  return new Intl.NumberFormat("ar-EG", {
    style: "currency",
    currency: "SAR",
  }).format(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusTone(status: string): "neutral" | "warning" | "success" | "danger" | "info" {
  if (status === "delivered" || status === "accepted" || status === "collected") {
    return "success";
  }

  if (status === "on_the_way" || status === "assigned" || status === "ready_for_pickup") {
    return "info";
  }

  if (status === "preparing" || status === "pending") {
    return "warning";
  }

  if (status === "rejected" || status === "cancelled") {
    return "danger";
  }

  return "neutral";
}

export function getStatusLabel(status: string) {
  return formatOrderStatusLabel(status);
}

export function getPaymentStatusLabel(paymentStatus: string, paymentMethod: string) {
  return formatPaymentStatusLabel(paymentStatus, paymentMethod);
}

export function getDriverNextActions(status: string) {
  if (status === "assigned") {
    return [{ label: "في الطريق", nextStatus: "on_the_way" }];
  }

  if (status === "on_the_way") {
    return [{ label: "تم التوصيل", nextStatus: "delivered" }];
  }

  return [];
}

function isDriverNextStatusAllowed(currentStatus: string | undefined, nextStatus: string) {
  return (
    (currentStatus === "assigned" && nextStatus === "on_the_way") ||
    (currentStatus === "on_the_way" && nextStatus === "delivered")
  );
}

export async function getCurrentDriverProfile(): Promise<DriverProfile> {
  const session = await getActiveSession();
  if (!session) {
    throw new Error("لم يتم العثور على جلسة Supabase نشطة. يرجى تسجيل الدخول مرة أخرى.");
  }

  const user = await getAuthenticatedUser();
  if (!user) {
    throw new Error("جلسة Supabase الحالية لا تحتوي على هوية المستخدم. يرجى تسجيل الدخول مرة أخرى.");
  }

  const { data: driverId, error: driverIdError } = await supabase.rpc("get_driver_id");

  if (driverIdError) {
    throw driverIdError;
  }

  if (!driverId) {
    throw new Error(`حساب السائق غير مرتبط بشكل صحيح بالمستخدم الحالي ${user.id}.`);
  }

  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      is_available,
      approval_status,
      profile:profiles!drivers_user_id_fkey(full_name)
    `)
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر العثور على ملف السائق.");
  }

  return {
    driverId: String(data.id),
    fullName: readName((data.profile as { full_name?: string } | { full_name?: string }[] | null) ?? null, "السائق"),
    isAvailable: Boolean(data.is_available),
    approvalStatus: String(data.approval_status ?? ""),
  };
}

function mapOrder(order: DriverOrderQueryRow): DriverOrder {
  const items = Array.isArray(order.items) ? order.items : [];
  return {
    id: String(order.id),
    customerName: readCustomerName(order.customer, "العميل"),
    vendorName: readVendorName(order.vendor as SingleRecord<{ name?: string }>, "المتجر"),
    pickupAddress: formatAddress(order.vendor as SingleRecord<{ address_line_1?: string; address_line_2?: string | null; city?: string; area?: string | null }>),
    dropoffAddress: formatAddress(order.address as SingleRecord<{ line_1?: string; line_2?: string | null; city?: string; area?: string | null }>),
    total: Number(order.total ?? 0),
    paymentMethod: String(order.payment_method ?? ""),
    paymentStatus: String(order.payment_status ?? ""),
    orderStatus: String(order.order_status ?? ""),
      createdAt: String(order.created_at ?? ""),
      items: items.map((item) => ({
        id: String(item.id),
        productName: readProductName(item.product as SingleRecord<{ name?: string }>, "المنتج"),
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unit_price ?? 0),
        totalPrice: Number(item.total_price ?? 0),
      })),
  };
}

export async function listAvailablePickupOrders(): Promise<DriverOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(
        name,
        address_line_1,
        address_line_2,
        city,
        area
      ),
      customer:customers(
        profile:profiles(full_name)
      ),
      address:addresses(
        line_1,
        lat,
        lng
      ),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .eq("order_status", "ready_for_pickup")
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DriverOrderQueryRow[]).map((order) => mapOrder(order));
}

export async function listCurrentDriverOrders(driverId: string): Promise<DriverOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(
        name,
        address_line_1,
        address_line_2,
        city,
        area
      ),
      customer:customers(
        profile:profiles(full_name)
      ),
      address:addresses(
        line_1,
        lat,
        lng
      ),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .eq("driver_id", driverId)
    .in("order_status", ["assigned", "on_the_way"])
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DriverOrderQueryRow[]).map((order) => mapOrder(order));
}

export async function claimAvailableOrder(orderId: string) {
  const { data, error } = await supabase
    .rpc("driver_claim_order", {
      p_order_id: orderId,
    })
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر قبول الطلب. قد يكون تم إسناده لسائق آخر.");
  }

  return {
    id: String((data as { order_id: string }).order_id),
    driverId: String((data as { driver_id: string }).driver_id),
    orderStatus: String((data as { order_status: string }).order_status),
  };
}

export async function getDriverOrderDetail(driverId: string, orderId: string): Promise<DriverOrder | null> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(
        name,
        address_line_1,
        address_line_2,
        city,
        area
      ),
      customer:customers(
        profile:profiles(full_name)
      ),
      address:addresses(
  line_1,
  lat,
  lng
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
    .eq("driver_id", driverId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapOrder(data as DriverOrderQueryRow) : null;
}

export async function updateDriverOrderStatus(input: {
  driverId: string;
  orderId: string;
  nextStatus: string;
  currentStatus?: string;
}) {
  if (!isDriverNextStatusAllowed(input.currentStatus, input.nextStatus)) {
    throw new Error("حالة الطلب المطلوبة غير مسموحة للسائق.");
  }

  const { data, error } = await supabase
    .rpc("driver_update_order_status", {
      p_order_id: input.orderId,
      p_next_status: input.nextStatus,
    })
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر تحديث الطلب.");
  }

  return {
    id: String((data as { order_id: string }).order_id),
    orderStatus: String((data as { order_status: string }).order_status),
  };
}
