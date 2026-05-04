import { cartItems } from "@medifast/ui";

export function buildMockCashOrder(deliveryAddressId: string) {
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = 4;

  return {
    customer_id: "cust-1",
    vendor_id: cartItems[0]?.product.vendor_id ?? "vendor-1",
    subtotal,
    delivery_fee: deliveryFee,
    total: subtotal + deliveryFee,
    payment_method: "cash_on_delivery" as const,
    payment_status: "pending" as const,
    order_status: "placed" as const,
    delivery_address_id: deliveryAddressId,
  };
}
