import { getSupabaseServerClient } from "../../lib/supabase/server";

const allowedTransitions: Record<string, string[]> = {
  placed: ["accepted", "rejected"],
  accepted: ["preparing", "rejected"],
  preparing: ["ready_for_pickup", "rejected"],
  ready_for_pickup: ["assigned", "rejected"],
  assigned: ["on_the_way", "rejected"],
  on_the_way: ["delivered", "rejected"],
};

export async function updateOrderStatus(orderId: string, currentStatus: string, nextStatus: string) {
  const allowed = allowedTransitions[currentStatus] ?? [];
  if (!allowed.includes(nextStatus)) {
    return {
      data: null,
      error: new Error(`Invalid status transition from ${currentStatus} to ${nextStatus}.`),
    };
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ order_status: nextStatus })
    .eq("id", orderId)
    .eq("order_status", currentStatus)
    .select("id, order_status")
    .maybeSingle();

  return {
    data: data
      ? {
          id: String(data.id),
          order_status: String(data.order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function assignDriver(orderId: string, driverId: string) {
  const supabase = getSupabaseServerClient();
  const { data: driver, error: driverLookupError } = await supabase
    .from("drivers")
    .select("id, is_available, approval_status")
    .eq("id", driverId)
    .maybeSingle();

  if (driverLookupError) {
    return {
      data: null,
      error: driverLookupError,
    };
  }

  if (!driver || !driver.is_available || String(driver.approval_status) !== "approved") {
    return {
      data: null,
      error: new Error("Selected driver is not currently available for assignment."),
    };
  }

  const { data, error } = await supabase
    .from("orders")
    .update({ driver_id: driverId, order_status: "assigned" })
    .eq("id", orderId)
    .eq("order_status", "ready_for_pickup")
    .select("id, driver_id, order_status")
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error: error ?? new Error("This order is no longer ready for driver assignment."),
    };
  }

  const { error: driverUpdateError } = await supabase
    .from("drivers")
    .update({ is_available: false })
    .eq("id", driverId)
    .eq("is_available", true);

  if (driverUpdateError) {
    await supabase.from("orders").update({ driver_id: null, order_status: "ready_for_pickup" }).eq("id", orderId);

    return {
      data: null,
      error: driverUpdateError,
    };
  }

  return {
    data: {
      id: String(data.id),
      driver_id: data.driver_id ? String(data.driver_id) : null,
      order_status: String(data.order_status),
    },
    error: null,
  };
}
