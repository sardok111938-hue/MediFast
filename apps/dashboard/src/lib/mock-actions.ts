export async function acceptVendorOrder(orderId: string) {
  return {
    id: orderId,
    order_status: "accepted",
    updated_at: new Date().toISOString(),
  };
}

export async function markOrderReady(orderId: string) {
  return {
    id: orderId,
    order_status: "ready_for_pickup",
    updated_at: new Date().toISOString(),
  };
}

export async function assignDriver(orderId: string, driverId: string) {
  return {
    id: orderId,
    driver_id: driverId,
    order_status: "assigned",
    updated_at: new Date().toISOString(),
  };
}
