import { formatOrderStatusLabel, formatPaymentStatusLabel } from "@medifast/i18n";
import { formatCurrencyLYD } from "@medifast/types";
import { getActiveSession, getAuthenticatedUser, supabase } from "./supabase";

export type DriverProfile = {
  driverId: string;
  fullName: string;
  phone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  isAvailable: boolean;
  approvalStatus: string;
  profileImageUrl: string | null;
  passportImageUrl: string | null;
  vehicleImageUrl: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
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
  customerPhone: string | null;
  vendorName: string;
  vendorPhone: string | null;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  estimatedDistanceKm: number | null;
  estimatedTravelMinutes: number | null;
  deliveryFee: number;
  deliveryPayout: number | null;
  codAmount: number | null;
  deliveryNotes: string | null;
  pharmacyInstructions: string | null;
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
  delivery_fee?: unknown;
  payment_method?: unknown;
  payment_status?: unknown;
  order_status?: unknown;
  notes?: unknown;
  created_at?: unknown;
  vendor?: SingleRecord<{
    name?: string;
    phone?: string | null;
    address_line_1?: string;
    address_line_2?: string | null;
    city?: string;
    area?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
  }>;
  customer?: SingleRecord<{ profile?: SingleRecord<{ full_name?: string; phone?: string | null }> }>;
  address?: SingleRecord<{
    line_1?: string;
    line_2?: string | null;
    city?: string;
    area?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
  }>;
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

function readOptionalText(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readOptionalNumber(value: unknown) {
  if (value == null || value === "") {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
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
    return "المنطقة غير متاحة";
  }

  return (
    [address.area, address.city]
      .filter(Boolean)
      .join(" - ") ||
    address.line_1 ||
    address.address_line_1 ||
    "المنطقة غير متاحة"
  );
}
  
function readCustomerName(
  value: SingleRecord<{ profile?: SingleRecord<{ full_name?: string }> }>,
  fallback: string
) {
  const customer = readSingle(value);
  const profile = readSingle(customer?.profile);

  return profile?.full_name?.trim() || fallback;
}

function readCustomerPhone(value: SingleRecord<{ profile?: SingleRecord<{ phone?: string | null }> }>) {
  return readOptionalText(readSingle(readSingle(value)?.profile)?.phone);
}

function estimateRouteDistanceKm(
  pickupLat: number | null,
  pickupLng: number | null,
  dropoffLat: number | null,
  dropoffLng: number | null
) {
  if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
    return null;
  }

  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = toRadians(dropoffLat - pickupLat);
  const lngDelta = toRadians(dropoffLng - pickupLng);
  const pickupLatRadians = toRadians(pickupLat);
  const dropoffLatRadians = toRadians(dropoffLat);
  const haversine =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(pickupLatRadians) * Math.cos(dropoffLatRadians) * Math.sin(lngDelta / 2) ** 2;

  const directDistanceKm = earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  return Math.max(0.5, Math.round(directDistanceKm * 2) / 2);
}

function estimateRouteTravelMinutes(distanceKm: number | null) {
  if (distanceKm == null) {
    return null;
  }

  const urbanAverageKmPerHour = 24;
  return Math.max(3, Math.round((distanceKm / urbanAverageKmPerHour) * 60));
}

export function normalizeError(error: unknown) {
  let message = "";

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object" && "message" in error) {
    message = String((error as { message?: unknown }).message ?? "");
  } else {
    message = String(error ?? "");
  }

  if (message.includes("Driver is not available")) {
    return "السائق غير متاح حالياً.";
  }

  if (message.includes("Order is no longer available")) {
    return "تم استلام الطلب بواسطة سائق آخر.";
  }

  if (message.includes("Driver not found")) {
    return "تعذر العثور على حساب السائق.";
  }

  return "حدث خطأ ما. حاول مرة أخرى.";
}

export function formatCurrency(value: number) {
  return formatCurrencyLYD(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function statusTone(status: string): "neutral" | "warning" | "success" | "danger" | "info" {
  if (status === "delivered" || status === "accepted" || status === "collected") {
    return "success";
  }

if (
  status === "on_the_way" ||
  status === "assigned" ||
  status === "picked_up" ||
  status === "ready_for_pickup"
) {
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
    return [{ label: "تم الاستلام", nextStatus: "picked_up" }];
  }

  if (status === "picked_up") {
    return [{ label: "في الطريق", nextStatus: "on_the_way" }];
  }

  if (status === "on_the_way") {
    return [{ label: "تم التوصيل", nextStatus: "delivered" }];
  }

  return [];
}

function isDriverNextStatusAllowed(currentStatus: string | undefined, nextStatus: string) {
  return (
    (currentStatus === "assigned" && nextStatus === "picked_up") ||
    (currentStatus === "picked_up" && nextStatus === "on_the_way") ||
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
  profile_image_url,
  passport_image_url,
  vehicle_image_url,
  emergency_contact_name,
  emergency_contact_phone,
  vehicle_type,
  vehicle_plate,
  profile:profiles!drivers_user_id_fkey(
    full_name,
    phone
  )
`)
    .eq("id", driverId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("تعذر العثور على ملف السائق.");
  }

const profile = readSingle(
  (data.profile as
    | { full_name?: string; phone?: string }
    | { full_name?: string; phone?: string }[]
    | null) ?? null
);

return {
  driverId: String(data.id),
  fullName: readName(
    (data.profile as { full_name?: string } | { full_name?: string }[] | null) ?? null,
    "السائق"
  ),
  phone: readOptionalText(profile?.phone),
  vehicleType: readOptionalText(data.vehicle_type),
  vehiclePlate: readOptionalText(data.vehicle_plate),
  isAvailable: Boolean(data.is_available),
  approvalStatus: String(data.approval_status ?? ""),
  profileImageUrl: readOptionalText(data.profile_image_url),
  passportImageUrl: readOptionalText(data.passport_image_url),
  vehicleImageUrl: readOptionalText(data.vehicle_image_url),
  emergencyContactName: readOptionalText(data.emergency_contact_name),
  emergencyContactPhone: readOptionalText(data.emergency_contact_phone),
};
}

function mapOrder(order: DriverOrderQueryRow): DriverOrder {
  const items = Array.isArray(order.items) ? order.items : [];
  const vendor = readSingle(order.vendor);
  const address = readSingle(order.address);
  const pickupLat = readOptionalNumber(vendor?.lat);
  const pickupLng = readOptionalNumber(vendor?.lng);
  const dropoffLat = readOptionalNumber(address?.lat);
  const dropoffLng = readOptionalNumber(address?.lng);
  const estimatedDistanceKm = estimateRouteDistanceKm(pickupLat, pickupLng, dropoffLat, dropoffLng);
  const deliveryFee = readOptionalNumber(order.delivery_fee) ?? 0;
  const paymentMethod = String(order.payment_method ?? "");
  const total = Number(order.total ?? 0);

  return {
    id: String(order.id),
    customerName: readCustomerName(order.customer, "الزبون"),
    customerPhone: readCustomerPhone(order.customer),
    vendorName: readVendorName(order.vendor as SingleRecord<{ name?: string }>, "المتجر"),
    vendorPhone: readOptionalText(vendor?.phone),
    pickupAddress: formatAddress(order.vendor as SingleRecord<{ address_line_1?: string; address_line_2?: string | null; city?: string; area?: string | null }>),
    pickupLat,
    pickupLng,
    dropoffAddress: formatAddress(order.address as SingleRecord<{ line_1?: string; line_2?: string | null; city?: string; area?: string | null }>),
    dropoffLat,
    dropoffLng,
    estimatedDistanceKm,
    estimatedTravelMinutes: estimateRouteTravelMinutes(estimatedDistanceKm),
    deliveryFee,
    deliveryPayout: deliveryFee > 0 ? 5 : null,
    codAmount: paymentMethod === "cash_on_delivery" ? total : null,
    deliveryNotes: readOptionalText(order.notes),
    pharmacyInstructions: null,
    total,
    paymentMethod,
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

const DRIVER_ORDER_LIST_SELECT = `
  id,
  total,
  delivery_fee,
  payment_method,
  payment_status,
  order_status,
  notes,
  created_at,
  vendor:vendors(
    name,
    city,
    area,
    lat,
    lng
  ),
  customer:customers!orders_customer_id_fkey(
    profile:profiles!customers_user_id_fkey(
      full_name,
      phone
    )
  ),
  address:addresses!orders_delivery_address_id_fkey(
    line_1,
    lat,
    lng
  )
`;

const AVAILABLE_DRIVER_ORDER_SELECT = `
  id,
  total,
  delivery_fee,
  payment_method,
  payment_status,
  order_status,
  notes,
  created_at,
  vendor:vendors(
    name,
    city,
    area,
    lat,
    lng
  )
`;

export async function listAvailablePickupOrders(): Promise<DriverOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(AVAILABLE_DRIVER_ORDER_SELECT)
    .eq("order_status", "ready_for_pickup")
    .is("driver_id", null)
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DriverOrderQueryRow[]).map((order) => mapOrder(order));
}

export async function listCurrentDriverOrders(
  driverId: string
): Promise<DriverOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(DRIVER_ORDER_LIST_SELECT)
    .eq("driver_id", driverId)
    .in("order_status", ["assigned", "picked_up", "on_the_way"])
    .order("created_at", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DriverOrderQueryRow[]).map((order) =>
    mapOrder(order)
  );
}

export async function listDeliveredDriverOrders(
  driverId: string
): Promise<DriverOrder[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(DRIVER_ORDER_LIST_SELECT)
    .eq("driver_id", driverId)
    .eq("order_status", "delivered")
    .order("delivered_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as DriverOrderQueryRow[]).map((order) =>
    mapOrder(order)
  );
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
      delivery_fee,
      payment_method,
      payment_status,
      order_status,
      notes,
      created_at,
      vendor:vendors(
        name,
        phone,
        city,
        area,
        address_line_1,
        address_line_2,
        lat,
        lng
      ),
      customer:customers!orders_customer_id_fkey(
  profile:profiles!customers_user_id_fkey(
    full_name,
    phone
  )
),
address:addresses!orders_delivery_address_id_fkey(
  line_1,
  lat,
  lng
),      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products!order_items_product_id_fkey(name)
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

export async function updateDriverLocation(input: {
  driverId: string;
  lat: number;
  lng: number;
}) {
  const { error } = await supabase
    .from("drivers")
    .update({
      current_lat: input.lat,
      current_lng: input.lng,
    })
    .eq("id", input.driverId);

  if (error) {
    throw error;
  }
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
