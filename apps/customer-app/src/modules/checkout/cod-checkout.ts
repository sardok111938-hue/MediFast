import type { CartItem } from "@medifast/types";
import { calculateDistanceKm } from "../marketplace/catalog/customer-catalog";
import { supabase } from "../../infrastructure/supabase";

export const DEFAULT_DELIVERY_FEE_ESTIMATE = 7;

type CheckoutPreviewLocation = {
  address?: { lat?: number | null; lng?: number | null } | null;
  vendor?: { lat?: number | null; lng?: number | null } | null;
};

export type CheckoutPreview = {
  vendorId: string;
  subtotal: number;
  deliveryFee: number;
  deliveryDistanceKm: number | null;
  total: number;
  itemCount: number;
};

function normalizeCheckoutError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر إتمام طلب الدفع عند الاستلام.";
}

export function buildCheckoutPreview(
  items: CartItem[],
  location?: CheckoutPreviewLocation,
): CheckoutPreview {
  if (items.length === 0) {
    throw new Error("السلة فارغة.");
  }

  const vendorIds = new Set(items.map((item) => item.snapshot.vendor_id));

  if (vendorIds.size > 1) {
    throw new Error("لا يمكن إتمام الطلب من أكثر من متجر في الوقت الحالي.");
  }

  const invalidItem = items.find(
    (item) => !item.product_id || !item.snapshot.is_active || item.quantity <= 0,
  );

  if (invalidItem) {
    throw new Error("توجد منتجات غير متاحة أو غير صالحة في السلة.");
  }

  const subtotal = items.reduce((sum, item) => sum + item.snapshot.price * item.quantity, 0);
  const vendorId = items[0]?.snapshot.vendor_id;

  if (!vendorId) {
    throw new Error("تعذر تحديد المتجر المرتبط بهذه السلة.");
  }

  const deliveryDistanceKm = calculateDistanceKm(location?.address, location?.vendor);

  return {
    vendorId,
    subtotal,
    deliveryFee: DEFAULT_DELIVERY_FEE_ESTIMATE,
    deliveryDistanceKm,
    total: subtotal + DEFAULT_DELIVERY_FEE_ESTIMATE,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function placeCashOnDeliveryOrder(items: CartItem[]) {
  const preview = buildCheckoutPreview(items);

  const { data, error } = await supabase.rpc("create_cod_order", {
    cart_items_input: items.map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    })),
  });

  if (error) {
    console.log("CREATE_COD_ORDER_ERROR", JSON.stringify(error, null, 2));
    throw new Error(error.message || normalizeCheckoutError(error));
  }

  if (!data) {
    throw new Error("لم يتم إنشاء الطلب.");
  }

  return {
    orderId: String(data),
    preview,
  };
}
