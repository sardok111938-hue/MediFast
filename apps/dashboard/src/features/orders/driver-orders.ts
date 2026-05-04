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

function formatDeliveryAddress(value: SingleRecord<{ line_1?: string; line_2?: string | null; city?: string; area?: string | null }>) {
  const address = readSingle(value);
  if (!address) {
    return "Delivery address unavailable";
  }

  return [address.line_1, address.line_2, address.area, address.city].filter(Boolean).join(", ") || "Delivery address unavailable";
}

export function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load driver orders right now.";
}

export function getDriverNextActions(status: string) {
  if (status === "assigned" || status === "accepted") {
    return [{ label: "Mark Out for Delivery", nextStatus: "on_the_way" }];
  }

  if (status === "on_the_way") {
    return [{ label: "Mark Delivered", nextStatus: "delivered" }];
  }

  return [];
}

export async function loadDriverOrdersData(): Promise<DriverOrdersData> {
  const supabase = getSupabaseBrowserClient();
  const { data: driverId, error: driverError } = await supabase.rpc("get_driver_id");

  if (driverError) {
    throw driverError;
  }

  if (!driverId) {
    throw new Error("Driver account is not linked correctly.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
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
        line_2,
        city,
        area
      )
    `)
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    driverId: String(driverId),
    orders: (data ?? []).map((order) => ({
      id: String(order.id),
      vendorName: readVendorName(order.vendor as SingleRecord<{ name?: string }>, "Vendor"),
      customerName: readName((order.customer as { profile?: SingleRecord<{ full_name?: string }> } | null)?.profile, "Customer"),
      total: Number(order.total ?? 0),
      orderStatus: String(order.order_status ?? ""),
      createdAt: String(order.created_at ?? ""),
      deliveryAddress: formatDeliveryAddress(order.address as SingleRecord<{ line_1?: string; line_2?: string | null; city?: string; area?: string | null }>),
    })),
  };
}

export async function updateDriverOrderStatus(input: {
  driverId: string;
  orderId: string;
  currentStatus: string;
  nextStatus: string;
}) {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("orders")
    .update({ order_status: input.nextStatus })
    .eq("id", input.orderId)
    .eq("driver_id", input.driverId)
    .eq("order_status", input.currentStatus);

  if (error) {
    throw error;
  }
}
