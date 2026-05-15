import { createElement } from "react";
import { formatPaymentStatusLabel } from "@medifast/types";
import { OrderStatusBadge } from "./components/order-status-badge";
import type { AdminOrderDetailRow, AdminOrderRow, TableModel, VendorOrderDetailRow, VendorOrderRow } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { formatCurrency } from "../../lib/utils/format-currency";

type NameContainer = { full_name?: string } | { full_name?: string }[] | null | undefined;
type ProductNameContainer = { name?: string } | { name?: string }[] | null | undefined;
type RelatedRecord<T> = T | T[] | null | undefined;
type CustomerRecord = { id?: string | null; user_id?: string | null };
type CustomerContainer = RelatedRecord<CustomerRecord>;
type ProfileRecord = {
  id?: string | null;
  full_name?: string | null;
  phone?: string | null;
};
type AddressRecord = {
  id?: string | null;
  line_1?: string | null;
  lat?: number | null;
  lng?: number | null;
};

const UNNAMED_CUSTOMER = "عميل بدون اسم";

function readName(value: NameContainer, fallback: string) {
  if (Array.isArray(value)) {
    return value[0]?.full_name ?? fallback;
  }

  return value?.full_name ?? fallback;
}

function readProductName(value: ProductNameContainer, fallback: string) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? fallback;
  }

  return value?.name ?? fallback;
}

function readRelatedRecord<T>(value: RelatedRecord<T>): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readCustomerUserId(value: CustomerContainer) {
  return readRelatedRecord(value)?.user_id ?? null;
}

async function getCustomerProfilesById(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>>,
  orders: { customer?: CustomerContainer }[],
) {
  const customerUserIds = Array.from(
    new Set(
      orders
        .map((order) => readCustomerUserId(order.customer))
        .filter((userId): userId is string => Boolean(userId)),
    ),
  );

  if (customerUserIds.length === 0) {
    return new Map<string, ProfileRecord>();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, phone")
    .in("id", customerUserIds);

  if (error) {
    throw error;
  }

  return new Map(
    ((data ?? []) as ProfileRecord[])
      .filter((profile): profile is ProfileRecord & { id: string } => Boolean(profile.id))
      .map((profile) => [profile.id, profile]),
  );
}

function readCustomerName(customer: CustomerContainer, profilesById: Map<string, ProfileRecord>) {
  const userId = readCustomerUserId(customer);

  if (!userId) {
    return UNNAMED_CUSTOMER;
  }

  const fullName = profilesById.get(userId)?.full_name?.trim();

  return fullName || UNNAMED_CUSTOMER;
}

export async function listOrdersForAdmin(): Promise<AdminOrderRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      payment_method,
      payment_status,
      order_status,
      total,
      created_at,
      customer:customers(id, user_id),
      address:addresses!orders_delivery_address_id_fkey(id, line_1, lat, lng),
      vendor:vendors(name),
      driver:drivers(
        profile:profiles(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => ({
    id: String(order.id),
    payment_method: String(order.payment_method),
    payment_status: String(order.payment_status),
    order_status: String(order.order_status),
    total: Number(order.total ?? 0),
    created_at: String(order.created_at ?? ""),
    vendor_name: (order.vendor as { name?: string } | null)?.name ?? "-",
    driver_name: readName((order.driver as { profile?: NameContainer } | null)?.profile, "Unassigned"),
  }));
}

export async function listAdminOrderDetails(): Promise<AdminOrderDetailRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      vendor_id,
      driver_id,
      payment_method,
      payment_status,
      order_status,
      total,
      subtotal,
      delivery_fee,
      created_at,
      customer:customers(id, user_id),
      vendor:vendors(name),
      driver:drivers(
        profile:profiles(full_name)
      ),
      address:addresses!orders_delivery_address_id_fkey(id, line_1, lat, lng),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as ({
    customer?: CustomerContainer;
    address?: RelatedRecord<AddressRecord>;
  } & NonNullable<typeof data>[number])[];
  
  const profilesById = await getCustomerProfilesById(supabase, orders);
  return orders.map((order) => {
    const address = order.address as RelatedRecord<AddressRecord>;
    const normalizedAddress = Array.isArray(address) ? address[0] : address;
    const items = Array.isArray(order.items) ? order.items : [];

    return {
      id: String(order.id),
      vendor_id: String(order.vendor_id),
      driver_id: order.driver_id ? String(order.driver_id) : null,
      payment_method: String(order.payment_method),
      payment_status: String(order.payment_status),
      order_status: String(order.order_status),
      total: Number(order.total ?? 0),
      subtotal: Number(order.subtotal ?? 0),
      delivery_fee: Number(order.delivery_fee ?? 0),
      created_at: String(order.created_at ?? ""),
      customer_name: readCustomerName(order.customer, profilesById),
      vendor_name: (order.vendor as { name?: string } | null)?.name ?? "-",
      driver_name: readName((order.driver as { profile?: NameContainer } | null)?.profile, "Unassigned"),
      address_label: "Address",
      address_line_1: normalizedAddress?.line_1 ?? "",
      address_line_2: null,
      city: "",
      area: null,
      items: items.map((item) => ({
        id: String(item.id),
        product_name: readProductName(item.product as ProductNameContainer, "Product"),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        total_price: Number(item.total_price ?? 0),
      })),
    };
  });
}

export async function listOrdersForVendor(vendorId?: string): Promise<VendorOrderRow[]> {
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select(`
      id,
      payment_method,
      payment_status,
      order_status,
      total,
      created_at,
      customer:customers(id, user_id),
      address:addresses!orders_delivery_address_id_fkey(id, line_1, lat, lng),
      driver:drivers(
        profile:profiles(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (vendorId) {
    query = query.eq("vendor_id", vendorId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as ({ customer?: CustomerContainer } & NonNullable<typeof data>[number])[];
  const profilesById = await getCustomerProfilesById(supabase, orders);
  return orders.map((order) => ({
    id: String(order.id),
    payment_method: String(order.payment_method),
    payment_status: String(order.payment_status),
    order_status: String(order.order_status),
    total: Number(order.total ?? 0),
    created_at: String(order.created_at ?? ""),
    customer_name: readCustomerName(order.customer, profilesById),    driver_name: readName((order.driver as { profile?: NameContainer } | null)?.profile, "Unassigned"),
  }));
}

export async function listVendorOrderDetails(vendorId?: string): Promise<VendorOrderDetailRow[]> {
  const supabase = await getSupabaseServerClient();
  let query = supabase
    .from("orders")
    .select(`
      id,
      payment_method,
      payment_status,
      order_status,
      total,
      subtotal,
      delivery_fee,
      created_at,
      customer:customers(id, user_id),
      driver:drivers(
        profile:profiles(full_name)
      ),
      address:addresses!orders_delivery_address_id_fkey(id, line_1, lat, lng),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .order("created_at", { ascending: false });

  if (vendorId) {
    query = query.eq("vendor_id", vendorId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  const orders = (data ?? []) as ({
    customer?: CustomerContainer;
    address?: RelatedRecord<AddressRecord>;
  } & NonNullable<typeof data>[number])[];
  const profilesById = await getCustomerProfilesById(supabase, orders);
  return orders.map((order) => {
    const address = order.address as RelatedRecord<AddressRecord>;
    const normalizedAddress = Array.isArray(address) ? address[0] : address;
    const items = Array.isArray(order.items) ? order.items : [];

    return {
      id: String(order.id),
      payment_method: String(order.payment_method),
      payment_status: String(order.payment_status),
      order_status: String(order.order_status),
      total: Number(order.total ?? 0),
      subtotal: Number(order.subtotal ?? 0),
      delivery_fee: Number(order.delivery_fee ?? 0),
      created_at: String(order.created_at ?? ""),
      customer_name: readCustomerName(order.customer, profilesById),      driver_name: readName((order.driver as { profile?: NameContainer } | null)?.profile, "Unassigned"),
      address_label: "Address",
      address_line_1: normalizedAddress?.line_1 ?? "",
      address_line_2: null,
      city: "",
      area: null,
      items: items.map((item) => ({
        id: String(item.id),
        product_name: readProductName(item.product as ProductNameContainer, "Product"),
        quantity: Number(item.quantity ?? 0),
        unit_price: Number(item.unit_price ?? 0),
        total_price: Number(item.total_price ?? 0),
      })),
    };
  });
}

export function getAdminOverviewOrdersTableModel(orders: AdminOrderRow[]): TableModel {
  return {
    title: "Live Orders",
    headers: ["Order", "Vendor", "Driver", "Status"],
    rows: orders.map((order) => [
      order.id,
      order.vendor_name,
      order.driver_name,
      createElement(OrderStatusBadge, {
        key: `${order.id}-overview-status`,
        status: order.order_status,
      }),
    ]),
  };
}

export function getAdminOrdersTableModel(orders: AdminOrderRow[]): TableModel {
  return {
    title: "Orders",
    headers: ["Order", "Payment", "Payment Status", "Status"],
    rows: orders.map((order) => [
      order.id,
      order.payment_method,
      formatPaymentStatusLabel(order.payment_status, order.payment_method),
      createElement(OrderStatusBadge, {
        key: `${order.id}-status`,
        status: order.order_status,
      }),
    ]),
  };
}

export function getVendorOverviewOrdersTableModel(orders: VendorOrderRow[]): TableModel {
  return {
    title: "Incoming Orders",
    headers: ["Order", "Payment", "Status", "Action"],
    rows: orders.map((order) => [
      order.id,
      order.payment_method,
      createElement(OrderStatusBadge, {
        key: `${order.id}-vendor-overview-status`,
        status: order.order_status,
      }),
      order.order_status === "placed" ? "Vendor accept/reject" : "Vendor workflow",
    ]),
  };
}

export function getVendorOrdersTableModel(orders: VendorOrderRow[]): TableModel {
  return {
    title: "Orders",
    headers: ["Order", "Total", "COD", "Status"],
    rows: orders.map((order) => [
      order.id,
      formatCurrency(order.total),
      formatPaymentStatusLabel(order.payment_status, order.payment_method),
      createElement(OrderStatusBadge, {
        key: `${order.id}-vendor-status`,
        status: order.order_status,
      }),
    ]),
  };
}
