import { products } from "@medifast/ui";
import { Card, DetailRow, Pill, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

const product = products[0];

export default function ProductDetailScreen() {
  return (
    <Screen title={product.name} subtitle="Detailed product page with barcode-ready structure.">
      <Card>
        <DetailRow label="الوصف" value={product.description} />
        <DetailRow label="الباركود" value={product.barcode} />
        <DetailRow label="Price" value={formatCustomerCurrency(product.price)} />
        {product.express ? <Pill label="Express delivery badge" /> : null}
        <PrimaryButton label="Add to cart" />
      </Card>
    </Screen>
  );
}
