import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
}

export interface TableModel {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}

export interface AdminOrderRow {
  id: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  total: number;
  vendor_name: string;
  driver_name: string;
  created_at: string;
}

export interface AdminOrderItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface AdminOrderDetailRow extends AdminOrderRow {
  customer_name: string;
  vendor_id: string;
  subtotal: number;
  delivery_fee: number;
  address_label: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  area: string | null;
  driver_id: string | null;
  items: AdminOrderItemRow[];
}

export interface VendorOrderRow {
  id: string;
  payment_method: string;
  payment_status: string;
  order_status: string;
  total: number;
  created_at: string;
  customer_name: string;
  driver_name: string;
}

export interface VendorOrderItemRow {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface VendorOrderDetailRow extends VendorOrderRow {
  subtotal: number;
  delivery_fee: number;
  address_label: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  area: string | null;
  items: VendorOrderItemRow[];
}

export interface ProductRow {
  id: string;
  vendor_id: string;
  category_id: string | null;
  name: string;
  description?: string | null;
  price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  barcode: string | null;
  is_active: boolean;
  image_url: string | null;
}

export interface ProductCategoryOption {
  id: string;
  name: string;
  name_ar: string | null;
  slug: string | null;
  icon: string | null;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  parent_id: string | null;
  display_name: string;
}

export interface VendorRow {
  id: string;
  user_id: string | null;
  name: string;
  address: string;
  rating: string;
  approval_status: string;
  is_open: boolean;
}

export interface DriverRow {
  id: string;
  user_id: string;
  full_name: string;
  is_available: boolean;
  approval_status: string;
  current_lat: number | null;
  current_lng: number | null;
}

export interface UserRow {
  id: string;
  full_name: string;
  role: string;
  phone: string | null;
  status: string;
}
