import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  Card,
  HelperText,
  ListCard,
  Pill,
  PrimaryButton,
  Screen,
  SearchInput,
  SectionTitle,
  StatusBadge,
} from "../src/components/CustomerUI";
import {
  formatCustomerCurrency,
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  loadCurrentCustomerOrders,
  orderStatusTone,
  type CustomerOrder,
} from "../src/lib/customer-orders";
import { addProductToCart, getCartItemCount, useCustomerCart } from "../src/lib/cart-store";
import { getCustomerCategories, getFeaturedProducts, getPrimaryAddress } from "../src/lib/customer-catalog";

export default function HomeScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const [latestOrder, setLatestOrder] = useState<CustomerOrder | null>(null);
  const [loadingLatestOrder, setLoadingLatestOrder] = useState(true);
  const categories = useMemo(() => getCustomerCategories().slice(0, 6), []);
  const featuredProducts = useMemo(() => getFeaturedProducts(), []);
  const primaryAddress = useMemo(() => getPrimaryAddress(), []);
  const cartCount = getCartItemCount(cartItems);

  const loadLatestOrder = useCallback(async () => {
    setLoadingLatestOrder(true);

    try {
      const result = await loadCurrentCustomerOrders();
      setLatestOrder(result.orders[0] ?? null);
    } catch {
      setLatestOrder(null);
    } finally {
      setLoadingLatestOrder(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestOrder();
  }, [loadLatestOrder]);

  return (
    <Screen title="Home" subtitle="Your pharmacy essentials, fast delivery, and live order updates in one place.">
      <Card style={styles.heroCard}>
        <View style={styles.heroRow}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>MediFast</Text>
            <Text style={styles.heroTitle}>Hello again</Text>
            <Text style={styles.heroText}>Find medicine, build your basket quickly, and keep delivery tracking close at hand.</Text>
          </View>
          <View style={styles.heroBadge}>
            <Text style={styles.heroBadgeLabel}>Cart</Text>
            <Text style={styles.heroBadgeValue}>{cartCount}</Text>
          </View>
        </View>

        <SearchInput placeholder="Search medicines, vitamins, skincare..." onPress={() => router.push("/search")} />

        <View style={styles.deliverySummary}>
          <View style={styles.deliveryCopy}>
            <Text style={styles.deliveryLabel}>Delivering to</Text>
            <Text style={styles.deliveryTitle}>{primaryAddress?.label ?? "Select address"}</Text>
            <Text style={styles.deliveryText}>
              {primaryAddress ? `${primaryAddress.line_1}, ${primaryAddress.area}` : "Choose a delivery address before checkout."}
            </Text>
          </View>
          <PrimaryButton label="Change" variant="secondary" onPress={() => router.push("/address-selection")} />
        </View>
      </Card>

      <SectionTitle label="Shop by Category" actionLabel="See all" onAction={() => router.push("/categories")} />
      <View style={styles.categoryGrid}>
        {categories.map((category) => (
          <ListCard
            key={category.id}
            title={category.name}
            subtitle="Browse category"
            onPress={() =>
              router.push({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          >
            <Pill label="Fast delivery" tone="info" />
          </ListCard>
        ))}
      </View>

      {latestOrder ? (
        <>
          <SectionTitle label="Track Latest Order" actionLabel="Open orders" onAction={() => router.push("/order-history")} />
          <ListCard
            title={`Order ${latestOrder.id}`}
            subtitle={latestOrder.vendorName}
            badge={<StatusBadge label={formatOrderStatusLabel(latestOrder.orderStatus)} tone={orderStatusTone(latestOrder.orderStatus)} />}
            onPress={() =>
              router.push({
                pathname: "/orders/[orderId]",
                params: { orderId: latestOrder.id },
              })
            }
          >
            <HelperText tone="info">{formatCustomerPaymentStatusLabel(latestOrder.paymentStatus, latestOrder.paymentMethod)}</HelperText>
            <Text style={styles.orderMeta}>{formatCustomerDate(latestOrder.createdAt)}</Text>
            <View style={styles.inlineButtons}>
              <PrimaryButton
                label="Track latest order"
                onPress={() =>
                  router.push({
                    pathname: "/orders/[orderId]",
                    params: { orderId: latestOrder.id },
                  })
                }
              />
              <PrimaryButton label="View all orders" variant="secondary" onPress={() => router.push("/order-history")} />
            </View>
          </ListCard>
        </>
      ) : loadingLatestOrder ? (
        <Card>
          <Text style={styles.sectionBodyTitle}>Checking your latest order</Text>
          <HelperText>We are loading your most recent delivery status.</HelperText>
        </Card>
      ) : null}

      <SectionTitle label="Featured Products" actionLabel="Browse all" onAction={() => router.push("/product-listing")} />
      {featuredProducts.map((product) => (
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

            <View style={styles.productFooter}>
              <View>
                <Text style={styles.productPrice}>{formatCustomerCurrency(product.price)}</Text>
                <Text style={styles.productStock}>{product.stock_quantity > 0 ? `In stock: ${product.stock_quantity}` : "Out of stock"}</Text>
              </View>
              <View style={styles.productActions}>
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
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
    gap: theme.spacing[16],
  },
  heroRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing[8],
  },
  eyebrow: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontSize: theme.typography.caption.sm,
  },
  heroTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.xl,
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
  },
  heroBadge: {
    minWidth: 78,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  heroBadgeLabel: {
    color: theme.colors.muted,
    fontWeight: "700",
    fontSize: theme.typography.caption.md,
  },
  heroBadgeValue: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  deliverySummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[12],
    backgroundColor: "#FFFFFF",
    borderRadius: theme.radius.md,
    padding: theme.spacing[16],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  deliveryCopy: {
    flex: 1,
    gap: 4,
  },
  deliveryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
  },
  deliveryTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
  },
  deliveryText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
  },
  categoryGrid: {
    gap: theme.spacing[12],
  },
  inlineButtons: {
    gap: 10,
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
  },
  sectionBodyTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.md,
  },
  productCard: {
    overflow: "hidden",
    padding: 0,
  },
  productImage: {
    width: "100%",
    height: 180,
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
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
  },
  productDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
  productFooter: {
    gap: theme.spacing[16],
  },
  productPrice: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.heading.md,
  },
  productStock: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    marginTop: 4,
  },
  productActions: {
    gap: 10,
  },
});
