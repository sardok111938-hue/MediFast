import { cartItems } from "@medifast/ui";
import { DetailRow, ListCard, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

export default function CartScreen() {
  return (
    <Screen title="Cart" subtitle="Cart state can later be stored in Supabase plus local persistence.">
      {cartItems.map((item) => (
        <ListCard key={item.id} title={item.product.name}>
          <DetailRow label="Quantity" value={String(item.quantity)} />
          <DetailRow label="Subtotal" value={formatCustomerCurrency(item.quantity * item.product.price)} />
        </ListCard>
      ))}
      <PrimaryButton label="Proceed to checkout" />
    </Screen>
  );
}
