import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { EmptyCard, ListCard, Pill, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import { filterProducts, getCustomerCategories } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const suggestedCategories = useMemo(() => getCustomerCategories().slice(0, 4), []);
  const results = useMemo(() => filterProducts({ query }), [query]);

  return (
    <Screen title="Search" subtitle="Find medicine, vitamins, and pharmacy essentials by name, symptom, or barcode.">
      <SearchInput placeholder="Try Paracetamol or scan a barcode..." value={query} onChangeText={setQuery} />

      <SectionTitle label="Suggested categories" />
      <View style={styles.suggestionRow}>
        {suggestedCategories.map((category) => (
          <PrimaryButton
            key={category.id}
            label={category.name}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          />
        ))}
      </View>

      <SectionTitle label={query ? "Search results" : "Popular results"} />
      {results.length === 0 ? (
        <EmptyCard
          title="No products found"
          message="Try a broader keyword, search by barcode, or browse the full product listing."
          action={<PrimaryButton label="Browse all products" onPress={() => router.push("/product-listing")} />}
        />
      ) : (
        results.map((product) => (
          <ListCard
            key={product.id}
            title={product.name}
            subtitle={product.description}
            badge={product.express ? <Pill label="Express delivery" tone="success" /> : null}
            onPress={() =>
              router.push({
                pathname: "/product-detail",
                params: { productId: product.id },
              })
            }
          >
            <View style={styles.resultRow}>
              <Image source={{ uri: product.image_url }} style={styles.resultImage} />
              <View style={styles.resultCopy}>
                <Text style={styles.resultPrice}>{formatCustomerCurrency(product.price)}</Text>
                <Text style={styles.resultMeta}>{product.stock_quantity > 0 ? `In stock: ${product.stock_quantity}` : "Out of stock"}</Text>
                <Text style={styles.resultMeta}>Barcode: {product.barcode ?? "-"}</Text>
              </View>
            </View>
          </ListCard>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestionRow: {
    gap: 10,
  },
  resultRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
    alignItems: "center",
  },
  resultImage: {
    width: 76,
    height: 76,
    borderRadius: theme.radius.md,
    backgroundColor: "#DCEBDF",
  },
  resultCopy: {
    flex: 1,
    gap: 4,
  },
  resultPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
  },
  resultMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
  },
});
