export type UserRole = "customer" | "driver" | "vendor" | "admin";

export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "rejected"
  | "ready_for_pickup"
  | "assigned"
  | "on_the_way"
  | "delivered"
  | "cancelled";

export type PaymentMethod = "cash_on_delivery";
export type PaymentStatus = "pending" | "collected";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export function formatPaymentStatusLabel(
  status: PaymentStatus | string,
  paymentMethod?: PaymentMethod | string | null
) {
  if (status === "pending") {
    return paymentMethod === "cash_on_delivery" ? "الدفع نقدًا عند التوصيل" : "قيد الانتظار";
  }

  if (status === "collected") {
    return paymentMethod === "cash_on_delivery" ? "تم تحصيل المبلغ" : "تم التحصيل";
  }

  return status.replaceAll("_", " ");
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
  icon: string;
  parent_id?: string | null;
  slug?: string | null;
  sort_order?: number | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface Vendor {
  id: string;
  name: string;
  address: string;
  rating: number;
  eta_minutes: number;
  is_open: boolean;
  image_url?: string | null;
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
