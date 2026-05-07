import { getSupabaseServerClient } from "../../lib/supabase/server";

type OrderStatusMutationResult = {
  id: string;
  order_status: string;
};

type DriverAssignmentMutationResult = {
  id: string;
  driver_id: string | null;
  order_status: string;
};

export async function updateAdminOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("admin_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function updateVendorOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("vendor_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function updateDriverOrderStatus(orderId: string, nextStatus: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("driver_update_order_status", {
      p_order_id: orderId,
      p_next_status: nextStatus,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("Order status could not be updated.") : null),
  };
}

export async function assignDriver(orderId: string, driverId: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .rpc("admin_assign_driver", {
      p_order_id: orderId,
      p_driver_id: driverId,
    })
    .single();

  return {
    data: data
      ? {
          id: String((data as { order_id: string }).order_id),
          driver_id: (data as { driver_id?: string | null }).driver_id ? String((data as { driver_id: string }).driver_id) : null,
          order_status: String((data as { order_status: string }).order_status),
        }
      : null,
    error: error ?? (!data ? new Error("This order is no longer ready for driver assignment.") : null),
  };
}
