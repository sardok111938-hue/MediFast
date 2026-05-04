import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, HelperText, Pill, PrimaryButton, QuantityStepper, Screen, SectionTitle } from "../src/components/CustomerUI";
import { addProductToCart } from "../src/lib/cart-store";
import { getCategoryById, getProductById, getVendorById } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const productId = Array.isArray(params.productId) ? params.productId[0] : params.productId;
  const product = getProductById(productId);
  const [quantity, setQuantity] = useState(1);
  const vendor = useMemo(() => getVendorById(product?.vendor_id), [product?.vendor_id]);
  const category = useMemo(() => getCategoryById(product?.category_id), [product?.category_id]);

  if (!product) {
    return (
      <Screen title="Product Detail" subtitle="Review item information before adding it to your basket." backHref="/product-listing" backLabel="Back to products">
        <EmptyCard
          title="Product not found"
          message="This product is unavailable right now. Return to the catalog to continue browsing."
          action={<PrimaryButton label="Back to products" onPress={() => router.push("/product-listing")} />}
        />
      </Screen>
    );
  }

  const outOfStock = product.stock_quantity === 0;

  return (
    <Screen
      title={product.name}
      subtitle="Review product information, choose a quantity, and add it to your cart."
      backHref="/product-listing"
      backLabel="Back to browsing"
    >
      <Card style={styles.heroCard}>
        <Image source={{ uri: product.image_url }} style={styles.productImage} />
        <View style={styles.heroBody}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>{product.description}</Text>
            </View>
            {product.express ? <Pill label="Express delivery" tone="success" /> : null}
          </View>

          <Text style={styles.price}>{formatCustomerCurrency(product.price)}</Text>
          <Text style={styles.stockLabel}>{outOfStock ? "Currently out of stock" : `${product.stock_quantity} items available`}</Text>

          <View style={styles.metaGrid}>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>Category</Text>
              <Text style={styles.metaValue}>{category?.name ?? "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>Pharmacy</Text>
              <Text style={styles.metaValue}>{vendor?.name ?? "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>Barcode</Text>
              <Text style={styles.metaValue}>{product.barcode ?? "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>Delivery ETA</Text>
              <Text style={styles.metaValue}>{vendor ? `${vendor.eta_minutes} min` : "-"}</Text>
            </View>
          </View>

          <SectionTitle label="Quantity" />
          <QuantityStepper
            value={quantity}
            onIncrement={() => setQuantity((current) => Math.min(product.stock_quantity || current + 1, current + 1))}
            onDecrement={() => setQuantity((current) => Math.max(1, current - 1))}
            disableIncrement={outOfStock || quantity >= product.stock_quantity}
            disableDecrement={quantity <= 1}
          />

          <HelperText tone="info">Add your quantity now and pay with cash on delivery when the order arrives.</HelperText>

          <View style={styles.buttonGroup}>
            <PrimaryButton
              label={outOfStock ? "Out of stock" : "Add to cart"}
              disabled={outOfStock}
              onPress={() => {
                addProductToCart(product, quantity);
                router.push("/cart");
              }}
            />
            <PrimaryButton label="Continue browsing" variant="secondary" onPress={() => router.push("/product-listing")} />
          </View>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 0,
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: 260,
    backgroundColor: "#DCEBDF",
  },
  heroBody: {
    padding: theme.spacing[20],
    gap: theme.spacing[16],
  },
  heroTop: {
    gap: theme.spacing[12],
  },
  heroCopy: {
    gap: theme.spacing[8],
  },
  productName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.xl,
  },
  productDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
  },
  price: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: 28,
  },
  stockLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
  },
  metaGrid: {
    gap: 10,
  },
  metaTile: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 4,
    backgroundColor: theme.colors.background,
  },
  metaTitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
  },
  metaValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "700",
  },
  buttonGroup: {
    gap: 10,
  },
});
