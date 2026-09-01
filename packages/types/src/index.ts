export type UserRole = "customer" | "driver" | "vendor" | "admin";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "rejected"
  | "ready_for_pickup"
  | "assigned"
  | "picked_up"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash_on_delivery";
export type PaymentStatus = "pending" | "collected";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type VendorType =
  | "pharmacy"
  | "grocery"
  | "restaurant"
  | "shop"
  | "home_business"
  | "water_supplier";

export type PrescriptionRequestStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";
  
export function formatOrderNumber(orderId?: string | null) {
  if (!orderId) {
    return "—";
  }

  return `${orderId.slice(0, 8)}#`;
}

export function formatCurrencyLYD(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);

  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)} د.ل`;
}

export function formatPaymentStatusLabel(
  status: PaymentStatus | string,
  paymentMethod?: PaymentMethod | string | null
) {
  const fallbackLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    collected: "تم التحصيل",
    cash_on_delivery: "الدفع عند الاستلام",
  };

  if (status === "cash_on_delivery") {
    return "الدفع عند الاستلام";
  }

  if (status === "pending") {
    return paymentMethod === "cash_on_delivery" ? "الدفع نقدًا عند التوصيل" : "قيد الانتظار";
  }

  if (status === "collected") {
    return paymentMethod === "cash_on_delivery" ? "تم تحصيل المبلغ" : "تم التحصيل";
  }

  return fallbackLabels[status] ?? status.replaceAll("_", " ");
}

export interface Profile {
  id: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
}

export interface Category {
  id: string;
  name: string;
  name_ar?: string | null;
  icon?: string | null;
  parent_id?: string | null;
  slug?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
  is_active?: boolean | null;
}
export interface VendorOperatingHour {
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  vendor_type: VendorType;
  phone?: string | null;
  address: string;
  rating: number;
  eta_minutes: number;
  completed_orders: number;
  is_open: boolean;
  image_url?: string | null;
  operating_hours?: VendorOperatingHour[];
  lat?: number | null;
  lng?: number | null;
  delivery_radius_km?: number | null;
}
export interface Product {
  id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  barcode?: string | null;
  stock_quantity: number;
  is_active: boolean;
  express?: boolean;
}

export interface CartProductSnapshot {
  product_id: string;
  vendor_id: string;
  category_id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  barcode?: string | null;
  stock_quantity: number;
  is_active: boolean;
}

export interface Address {
  id: string;
  customer_id?: string;
  line_1: string;
  lat?: number | null;
  lng?: number | null;
  created_at?: string;
}

export interface PrescriptionRequest {
  id: string;
  customer_id: string;
  vendor_id: string;
  address_id: string;
  image_path: string;
  note: string | null;
  vendor_note: string | null;
  status: PrescriptionRequestStatus;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
}

export interface PrescriptionQuote {
  id: string;
  prescription_request_id: string;
  vendor_id: string;
  customer_id: string;
  status: PrescriptionQuoteStatus;
  vendor_note: string | null;
  customer_note: string | null;
  subtotal: number;
  created_at: string;
  updated_at: string;
  accepted_at: string | null;
}

export interface PrescriptionQuoteItem {
  id: string;
  quote_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  availability_status: PrescriptionQuoteItemAvailability;
  note: string | null;
  created_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  quantity: number;
  snapshot: CartProductSnapshot;
}

export interface Order {
  id: string;
  customer_id: string;
  vendor_id: string;
  driver_id?: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  order_status: OrderStatus;
  delivery_address_id: string;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string;
  full_name: string;
  is_available: boolean;
  current_lat?: number | null;
  current_lng?: number | null;
  approval_status: ApprovalStatus;
  profile_image_url?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
}

export interface DeliveryTrackingPoint {
  id: string;
  order_id: string;
  lat: number;
  lng: number;
  status: OrderStatus;
  recorded_at: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  hint: string;
}

export type PrescriptionQuoteStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "expired";

export type PrescriptionQuoteItemAvailability =
  | "available"
  | "unavailable"
  | "substitute";
