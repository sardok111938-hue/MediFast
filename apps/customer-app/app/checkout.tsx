import { cartItems } from "@medifast/ui";
import { Card, DetailRow, PrimaryButton, Screen, StatusBadge } from "../src/components/CustomerUI";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
const deliveryFee = 4;
const total = subtotal + deliveryFee;

export default function CheckoutScreen() {
  return (
    <Screen title="Checkout" subtitle="MVP flow uses cash on delivery only.">
      <Card>
        <DetailRow label="Subtotal" value={formatCustomerCurrency(subtotal)} />
        <DetailRow label="Delivery fee" value={formatCustomerCurrency(deliveryFee)} />
        <DetailRow label="Total" value={formatCustomerCurrency(total)} />
        <DetailRow label="Payment method" value="Cash on delivery" />
        <DetailRow label="Payment status" value={<StatusBadge label="pending" tone="warning" />} />
        <DetailRow label="Order status" value={<StatusBadge label="placed" tone="info" />} />
      </Card>
      <PrimaryButton label="Place cash order" />
    </Screen>
  );
}
