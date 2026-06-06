"use client";

import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export type DriverOrder = {
  id: string;
  vendorName: string;
  customerName: string;
  total: number;
  orderStatus: string;
  createdAt: string;
  deliveryAddress: string;
};

export type DriverOrdersData = {
  driverId: string;
  availableOrders: DriverOrder[];
  orders: DriverOrder[];
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

function formatDeliveryAddress(
  value: SingleRecord<{ line_1?: string | null; lat?: number | string | null; lng?: number | string | null }>
) {
  const address = Array.isArray(value) ? value[0] : value;
  return address?.line_1 || "عنوان التوصيل غير متاح";
}

export function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تحميل طلبات السائق الآن.";
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
function mapDriverOrder(order: Record<string, unknown>): DriverOrder {
  return {
    id: String(order.id),
    vendorName: readVendorName(order.vendor as SingleRecord<{ name?: string }>, "المتجر"),
    customerName: readName(
      (order.customer as { profile?: SingleRecord<{ full_name?: string }> } | null)?.profile,
      "الزبون"
    ),
    total: Number(order.total ?? 0),
    orderStatus: String(order.order_status ?? ""),
    createdAt: String(order.created_at ?? ""),
    deliveryAddress: formatDeliveryAddress(
      order.address as SingleRecord<{
        line_1?: string | null;
        lat?: number | string | null;
        lng?: number | string | null;
      }>
    ),
  };
}
export async function loadDriverOrdersData(): Promise<DriverOrdersData> {
  const supabase = getSupabaseBrowserClient();
  const { data: driverId, error: driverError } = await supabase.rpc("get_driver_id");

  if (driverError) {
    throw driverError;
  }

  if (!driverId) {
    throw new Error("حساب السائق غير مرتبط بشكل صحيح.");
  }

  const orderSelect = `
    id,
    total,
    order_status,
    created_at,
    vendor:vendors(name),
    customer:customers(
      profile:profiles(full_name)
    ),
    address:addresses(
      line_1,
      lat,
      lng
    )
  `;

  const [assignedResult, availableResult] = await Promise.all([
    supabase
      .from("orders")
      .select(orderSelect)
      .eq("driver_id", driverId)
      .order("created_at", { ascending: false }),

    supabase
      .from("orders")
      .select(orderSelect)
      .eq("order_status", "ready_for_pickup")
      .is("driver_id", null)
      .order("created_at", { ascending: true }),
  ]);

  if (assignedResult.error) {
    throw assignedResult.error;
  }

  if (availableResult.error) {
    throw availableResult.error;
  }

  return {
    driverId: String(driverId),
    orders: (assignedResult.data ?? []).map((order) => mapDriverOrder(order as Record<string, unknown>)),
    availableOrders: (availableResult.data ?? []).map((order) => mapDriverOrder(order as Record<string, unknown>)),
  };
}

export async function claimDriverOrder(orderId: string) {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .rpc("driver_claim_order", {
      p_order_id: orderId,
    })
    .single();

  if (error) {
    throw error;
  }

  return data;
}