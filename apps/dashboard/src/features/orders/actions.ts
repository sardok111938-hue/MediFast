"use server";

import { revalidatePath } from "next/cache";
import {
  assignDriver,
  cancelAdminOrder,
  updateDriverOrderStatus,
  updateVendorOrderStatus,
} from "./api";

type OrderActionResult = {
  success: boolean;
  error: string | null;
};

const vendorOrderStatuses = new Set(["accepted", "preparing", "ready_for_pickup", "rejected"]);
const driverOrderStatuses = new Set(["picked_up", "on_the_way", "delivered"]);

function invalidStatusResult(): OrderActionResult {
  return {
    success: false,
    error: "حالة الطلب المطلوبة غير مسموحة لهذا الدور.",
  };
}

export async function updateVendorOrderStatusAction(input: {
  orderId: string;
  nextStatus: string;
}): Promise<OrderActionResult> {
  if (!vendorOrderStatuses.has(input.nextStatus)) {
    return invalidStatusResult();
  }

  const result = await updateVendorOrderStatus(input.orderId, input.nextStatus);

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  revalidatePath("/vendor/orders");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/assignments");

  return {
    success: true,
    error: null,
  };
}

export async function updateDriverOrderStatusAction(input: {
  orderId: string;
  nextStatus: string;
}): Promise<OrderActionResult> {
  if (!driverOrderStatuses.has(input.nextStatus)) {
    return invalidStatusResult();
  }

  const result = await updateDriverOrderStatus(input.orderId, input.nextStatus);

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  revalidatePath("/driver/orders");
  revalidatePath("/driver");
  revalidatePath("/admin/orders");
  revalidatePath("/admin/assignments");

  return {
    success: true,
    error: null,
  };
}

export async function assignDriverAction(input: {
  orderId: string;
  driverId: string;
}): Promise<OrderActionResult> {
  if (!input.orderId || !input.driverId) {
    return {
      success: false,
      error: "يرجى اختيار طلب وسائق صالحين قبل الإسناد.",
    };
  }

  const result = await assignDriver(input.orderId, input.driverId);

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  revalidatePath("/admin/assignments");
  revalidatePath("/admin/orders");
  revalidatePath("/driver");
  revalidatePath("/driver/orders");

  return {
    success: true,
    error: null,
  };
}

export async function cancelAdminOrderAction(input: {
  orderId: string;
}): Promise<OrderActionResult> {
  if (!input.orderId) {
    return {
      success: false,
      error: "معرّف الطلب غير صالح.",
    };
  }

  const result = await cancelAdminOrder(input.orderId);

  if (result.error) {
    return {
      success: false,
      error: result.error.message,
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath("/admin/assignments");
  revalidatePath("/driver");
  revalidatePath("/driver/orders");

  return {
    success: true,
    error: null,
  };
}
