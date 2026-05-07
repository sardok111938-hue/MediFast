"use server";

import { revalidatePath } from "next/cache";
import { assignDriver, updateAdminOrderStatus, updateDriverOrderStatus, updateVendorOrderStatus } from "./api";

type OrderActionResult = {
  success: boolean;
  error: string | null;
};

export async function updateVendorOrderStatusAction(input: {
  orderId: string;
  nextStatus: string;
}): Promise<OrderActionResult> {
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

export async function updateAdminOrderStatusAction(input: {
  orderId: string;
  nextStatus: string;
}): Promise<OrderActionResult> {
  const result = await updateAdminOrderStatus(input.orderId, input.nextStatus);

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
  revalidatePath("/vendor/orders");

  return {
    success: true,
    error: null,
  };
}

export async function updateDriverOrderStatusAction(input: {
  orderId: string;
  nextStatus: string;
}): Promise<OrderActionResult> {
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
