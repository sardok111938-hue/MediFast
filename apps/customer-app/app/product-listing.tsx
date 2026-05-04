import { products } from "@medifast/ui";
import { ListCard, Pill, Screen } from "../src/components/CustomerUI";
import { StyleSheet, Text } from "react-native";
import { useCustomerI18n } from "../src/lib/i18n";
import { formatCustomerCurrency } from "../src/lib/customer-orders";
import { theme } from "@medifast/ui";

export default function ProductListingScreen() {
  const { t, isRTL } = useCustomerI18n();

  return (
    <Screen title="Product Listing" subtitle="Category or pharmacy-specific grid/list placeholder.">
      {products.map((product) => (
        <ListCard key={product.id} title={product.name} subtitle={`${t("Stock:")} ${product.stock_quantity}`} badge={product.express ? <Pill label="Express delivery" /> : null}>
          <Text style={[styles.price, isRTL ? styles.textRight : null]}>{formatCustomerCurrency(product.price)}</Text>
        </ListCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  price: {
    fontWeight: "800",
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
  },
  textRight: {
    textAlign: "right",
  },
});
