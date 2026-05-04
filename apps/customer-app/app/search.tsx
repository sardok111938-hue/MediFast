import { products } from "@medifast/ui";
import { Card, HelperText, Screen, SearchInput } from "../src/components/CustomerUI";

export default function SearchScreen() {
  return (
    <Screen title="Search" subtitle="Product and barcode-friendly search surface.">
      <SearchInput placeholder="Try Paracetamol or scan a barcode..." />
      {products.map((product) => (
        <Card key={product.id}>
          <HelperText tone="success">{product.name}</HelperText>
          <HelperText>{product.description}</HelperText>
        </Card>
      ))}
    </Screen>
  );
}
