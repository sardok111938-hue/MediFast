import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, Pill, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import { addProductToCart } from "../src/lib/cart-store";
import { filterProducts, getCategoryById, getCustomerCategories } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

export default function ProductListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string | string[]; query?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const query = Array.isArray(params.query) ? params.query[0] : params.query;
  const activeCategory = getCategoryById(categoryId);
  const categories = useMemo(() => getCustomerCategories(), []);
  const products = useMemo(() => filterProducts({ categoryId, query }), [categoryId, query]);

  return (
    <Screen
      title={activeCategory?.name ?? "Product Listing"}
      subtitle={activeCategory ? "Shop this category with quick cart actions and clear stock information." : "Browse the pharmacy catalog with clean product cards."}
      backHref={categoryId ? "/categories" : "/home"}
      backLabel={categoryId ? "Back to categories" : "Back to home"}
    >
      <SearchInput placeholder="Search the catalog..." onPress={() => router.push("/search")} />

      <SectionTitle label="Browse categories" />
      <View style={styles.categoryRow}>
        {categories.map((category) => (
          <PrimaryButton
            key={category.id}
            label={category.name}
            variant={category.id === categoryId ? "primary" : "secondary"}
            onPress={() =>
              router.replace({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          />
        ))}
      </View>

      <SectionTitle label={query ? "Matching products" : "Available products"} />
      {products.length === 0 ? (
        <EmptyCard
          title="No products found"
          message="No products matched this category or search. Try a different category or open search."
          action={<PrimaryButton label="Open search" onPress={() => router.push("/search")} />}
        />
      ) : (
        products.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <Image source={{ uri: product.image_url }} style={styles.productImage} />
            <View style={styles.productBody}>
              <View style={styles.productHeader}>
                <View style={styles.productCopy}>
                  <Text style={styles.productName}>{product.name}</Text>
                  <Text style={styles.productDescription}>{product.description}</Text>
                </View>
                {product.express ? <Pill label="Express delivery" tone="success" /> : null}
              </View>

              <View style={styles.metaRow}>
                <Text style={styles.productPrice}>{formatCustomerCurrency(product.price)}</Text>
                <Text style={styles.productStock}>{product.stock_quantity > 0 ? `In stock: ${product.stock_quantity}` : "Out of stock"}</Text>
              </View>

              <View style={styles.buttonGroup}>
                <PrimaryButton
                  label="View details"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/product-detail",
                      params: { productId: product.id },
                    })
                  }
                />
                <PrimaryButton
                  label="Add to cart"
                  disabled={product.stock_quantity === 0}
                  onPress={() => {
                    addProductToCart(product, 1);
                    router.push("/cart");
                  }}
                />
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    gap: 10,
  },
  productCard: {
    padding: 0,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 200,
    backgroundColor: "#DCEBDF",
  },
  productBody: {
    padding: theme.spacing[20],
    gap: theme.spacing[16],
  },
  productHeader: {
    gap: theme.spacing[12],
  },
  productCopy: {
    gap: theme.spacing[8],
  },
  productName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  productDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
  metaRow: {
    gap: 4,
  },
  productPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
  },
  productStock: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
  },
  buttonGroup: {
    gap: 10,
  },
});
