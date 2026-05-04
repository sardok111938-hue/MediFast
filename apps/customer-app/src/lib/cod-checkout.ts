import type { CartItem } from "@medifast/types";
import { supabase } from "./supabase";

export const COD_DELIVERY_FEE = 4;

export type CheckoutPreview = {
  vendorId: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  itemCount: number;
};

function normalizeCheckoutError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر إتمام طلب الدفع عند الاستلام.";
}

export function buildCheckoutPreview(items: CartItem[]): CheckoutPreview {
  if (items.length === 0) {
    throw new Error("السلة فارغة.");
  }

  const vendorIds = new Set(items.map((item) => item.product.vendor_id));
  if (vendorIds.size > 1) {
    throw new Error("لا يمكن إتمام الطلب من أكثر من متجر في الوقت الحالي.");
  }

  const invalidItem = items.find((item) => !item.product.id || !item.product.is_active || item.quantity <= 0);
  if (invalidItem) {
    throw new Error("توجد منتجات غير متاحة أو غير صالحة في السلة.");
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const vendorId = items[0]?.product.vendor_id;

  if (!vendorId) {
    throw new Error("تعذر تحديد المتجر المرتبط بهذه السلة.");
  }

  return {
    vendorId,
    subtotal,
    deliveryFee: COD_DELIVERY_FEE,
    total: subtotal + COD_DELIVERY_FEE,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function placeCashOnDeliveryOrder(items: CartItem[]) {
  const preview = buildCheckoutPreview(items);

  const { data, error } = await supabase.rpc("create_cod_order", {
    cart_items_input: items.map((item) => ({
      product_id: item.product.id,
      quantity: item.quantity,
    })),
  });

  if (error) {
    throw new Error(normalizeCheckoutError(error));
  }

  if (!data) {
    throw new Error("لم يتم إنشاء الطلب.");
  }

  return {
    orderId: String(data),
    preview,
  };
}
