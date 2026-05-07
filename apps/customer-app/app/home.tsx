import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { formatCategoryLabel } from "@medifast/i18n";
import { theme } from "@medifast/ui";
import {
  Card,
  ErrorCard,
  HelperText,
  LoadingCard,
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
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../src/lib/customer-orders";
import { addProductToCart, getCartItemCount, useCustomerCart } from "../src/lib/cart-store";
import {
  formatSavedAddressLine,
  getCategoryById,
  getFeaturedProducts,
  hasSavedAddressCoordinates,
  getPrimaryAddress,
  getVendorById,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";
import { CatalogImage } from "../src/components/CatalogImage";

export default function HomeScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const [latestOrder, setLatestOrder] = useState<CustomerOrder | null>(null);
  const [loadingLatestOrder, setLoadingLatestOrder] = useState(true);
  const [latestOrderError, setLatestOrderError] = useState<string | null>(null);

  const { data: catalog, loading: loadingCatalog, error: catalogError, reload } = useCustomerCatalogData();

  const categories = useMemo(() => catalog.categories.slice(0, 8), [catalog.categories]);
  const featuredProducts = useMemo(() => getFeaturedProducts(catalog.products).slice(0, 6), [catalog.products]);
  const primaryAddress = useMemo(
    () => getPrimaryAddress(catalog.addresses, catalog.defaultAddressId),
    [catalog.addresses, catalog.defaultAddressId],
  );

  const cartCount = getCartItemCount(cartItems);

  const loadLatestOrder = useCallback(async () => {
    setLoadingLatestOrder(true);
    setLatestOrderError(null);

    try {
      const result = await loadCurrentCustomerOrders();
      setLatestOrder(result.orders[0] ?? null);
    } catch (error) {
      setLatestOrder(null);
      setLatestOrderError(normalizeCustomerOrderError(error));
    } finally {
      setLoadingLatestOrder(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestOrder();
  }, [loadLatestOrder]);

  return (
    <Screen title="الرئيسية" subtitle="كل احتياجاتك الصحية من أقرب صيدلية إلى بابك.">
      {loadingCatalog ? <LoadingCard message="جارٍ تحميل المنتجات والعناوين..." /> : null}
      {!loadingCatalog && catalogError ? <ErrorCard message={catalogError} onRetry={() => void reload()} /> : null}

      <View style={styles.quickHeader}>
        <Pressable style={styles.addressPill} onPress={() => router.push("/address-selection")}>
          <Text style={styles.addressLabel}>التوصيل إلى</Text>
          <Text style={styles.addressTitle} numberOfLines={1}>
            {primaryAddress ? formatSavedAddressLine(primaryAddress) : "اختر عنوان التوصيل"}
          </Text>
          {primaryAddress && hasSavedAddressCoordinates(primaryAddress) ? <Text style={styles.addressMeta}>تم تحديد الموقع</Text> : null}
        </Pressable>

        <Pressable style={styles.cartCircle} onPress={() => router.push("/cart")}>
          <Text style={styles.cartCircleValue}>{cartCount}</Text>
        </Pressable>
      </View>

      <View style={styles.searchHero}>
        <SearchInput placeholder="ابحث عن دواء أو منتج صحي..." onPress={() => router.push("/search")} />
      </View>

      <SectionTitle label="تسوّق حسب الفئة" actionLabel="عرض الكل" onAction={() => router.push("/categories")} />

      <View style={styles.categoryChips}>
        {categories.map((category) => (
          <Pressable
            key={category.id}
            style={styles.categoryChip}
            onPress={() =>
              router.push({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          >
            <Text style={styles.categoryIcon}>＋</Text>
            <Text style={styles.categoryName} numberOfLines={1}>
              {formatCategoryLabel(category)}
            </Text>
          </Pressable>
        ))}
      </View>

      {latestOrder ? (
        <>
          <SectionTitle label="تتبع آخر طلب" actionLabel="كل الطلبات" onAction={() => router.push("/order-history")} />
          <Pressable
            style={styles.orderCard}
            onPress={() =>
              router.push({
                pathname: "/orders/[orderId]",
                params: { orderId: latestOrder.id },
              })
            }
          >
            <View style={styles.orderTopRow}>
              <View style={styles.orderCopy}>
                <Text style={styles.orderTitle}>الطلب {latestOrder.id}</Text>
                <Text style={styles.orderVendor}>{latestOrder.vendorName}</Text>
              </View>
              <StatusBadge label={formatOrderStatusLabel(latestOrder.orderStatus)} tone={orderStatusTone(latestOrder.orderStatus)} />
            </View>
            <HelperText tone="info">{formatCustomerPaymentStatusLabel(latestOrder.paymentStatus, latestOrder.paymentMethod)}</HelperText>
            <Text style={styles.orderMeta}>{formatCustomerDate(latestOrder.createdAt)}</Text>
          </Pressable>
        </>
      ) : loadingLatestOrder ? (
        <Card>
          <Text style={styles.sectionBodyTitle}>جارٍ التحقق من آخر طلب</Text>
          <HelperText>نحمّل الآن آخر تحديث لحالة التوصيل.</HelperText>
        </Card>
      ) : latestOrderError ? (
        <Card>
          <Text style={styles.sectionBodyTitle}>تعذر تحميل آخر طلب</Text>
          <HelperText>{latestOrderError}</HelperText>
        </Card>
      ) : null}

      <SectionTitle label="منتجات مميزة" actionLabel="تصفح الكل" onAction={() => router.push("/product-listing")} />

      {!loadingCatalog && featuredProducts.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>لا توجد منتجات متاحة الآن</Text>
          <HelperText>سيتم عرض المنتجات هنا عند توفرها من الصيدليات.</HelperText>
        </Card>
      ) : null}

      <View style={styles.productGrid}>
        {featuredProducts.map((product) => {
          const vendor = getVendorById(catalog.vendors, product.vendor_id);
          const category = getCategoryById(catalog.categories, product.category_id);

          return (
            <Pressable
              key={product.id}
              style={styles.productCard}
              onPress={() =>
                router.push({
                  pathname: "/product-detail",
                  params: { productId: product.id },
                })
              }
            >
              <CatalogImage uri={product.image_url} alt={product.name} containerStyle={styles.productImageWrap} imageStyle={styles.productImage} />

              <View style={styles.productBody}>
                <View style={styles.productBadgeRow}>
                  {category ? <Pill label={formatCategoryLabel(category)} tone="info" /> : null}
                </View>

                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>

                <Text style={styles.productVendor} numberOfLines={1}>
                  {vendor ? vendor.name : "صيدلية"}
                </Text>

                <View style={styles.productBottom}>
                  <View>
                    <Text style={styles.productPrice}>{formatCustomerCurrency(product.price)}</Text>
                    <Text style={styles.productStock}>{product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : "غير متوفر"}</Text>
                  </View>

                  <Pressable
                    style={[styles.addButton, product.stock_quantity === 0 ? styles.addButtonDisabled : null]}
                    disabled={product.stock_quantity === 0}
                    onPress={(event) => {
                      event.stopPropagation();
                      addProductToCart(product, 1);
                      router.push("/cart");
                    }}
                  >
                    <Text style={styles.addButtonText}>＋</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <PrimaryButton label="تصفح كل المنتجات" variant="secondary" onPress={() => router.push("/product-listing")} />
    </Screen>
  );
}

const styles = StyleSheet.create({
quickHeader: {
  flexDirection: "row-reverse",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing[12],
},

addressPill: {
  flex: 1,
  backgroundColor: "#FFFFFF",
  borderRadius: 999,
  paddingHorizontal: theme.spacing[16],
  paddingVertical: 11,
  borderWidth: 1,
  borderColor: "#DDEBE2",
},

addressLabel: {
  color: theme.colors.muted,
  fontSize: theme.typography.caption.sm,
  fontWeight: "700",
  textAlign: "right",
},

addressTitle: {
  color: theme.colors.text,
  fontSize: theme.typography.body.sm,
  fontWeight: "900",
  textAlign: "right",
},

addressMeta: {
  color: theme.colors.primaryDark,
  fontSize: theme.typography.caption.md,
  textAlign: "right",
},

cartCircle: {
  width: 48,
  height: 48,
  borderRadius: 24,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: theme.colors.primary,
},

cartCircleValue: {
  color: "#FFFFFF",
  fontSize: theme.typography.body.lg,
  fontWeight: "900",
},

searchHero: {
  backgroundColor: "#E8F7EE",
  borderRadius: 26,
  padding: theme.spacing[12],
  borderWidth: 1,
  borderColor: "#D0E9D9",
},
  cartBadge: {
    minWidth: 64,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    borderWidth: 1,
    borderColor: "#D7E9DC",
  },
  cartBadgeLabel: {
    color: theme.colors.muted,
    fontWeight: "700",
    fontSize: theme.typography.caption.sm,
  },
  cartBadgeValue: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: theme.typography.heading.md,
  },
  deliverySummary: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: theme.spacing[16],
    borderWidth: 1,
    borderColor: "#D7E9DC",
  },
  deliveryCopy: {
    flex: 1,
    gap: 3,
  },
  deliveryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  deliveryTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: theme.typography.body.md,
    textAlign: "right",
  },
  deliveryText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    lineHeight: 18,
    textAlign: "right",
  },
  deliveryAction: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: theme.typography.body.sm,
  },
  categoryChips: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },
  categoryChip: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#DDEBE2",
  },
  categoryIcon: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: 14,
  },
  categoryName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.caption.md,
    maxWidth: 110,
    textAlign: "right",
  },
  orderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: theme.spacing[16],
    gap: theme.spacing[12],
    borderWidth: 1,
    borderColor: "#DDEBE2",
  },
  orderTopRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  orderCopy: {
    flex: 1,
    gap: 3,
  },
  orderTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: theme.typography.body.lg,
    textAlign: "right",
  },
  orderVendor: {
    color: theme.colors.muted,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  sectionBodyTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: theme.typography.heading.md,
    textAlign: "right",
  },
  emptyCard: {
    alignItems: "stretch",
    gap: 6,
  },
  emptyTitle: {
    color: theme.colors.text,
    fontWeight: "900",
    fontSize: theme.typography.heading.md,
    textAlign: "right",
  },
  productGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },
  productCard: {
    width: "48%",
    minWidth: 155,
    flexGrow: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#DDEBE2",
  },
  productImageWrap: {
    margin: 10,
    marginBottom: 0,
    borderRadius: 20,
    backgroundColor: "#EFF8F2",
  },
  productImage: {
    width: "100%",
    height: 118,
  },
  productBody: {
    padding: theme.spacing[12],
    gap: theme.spacing[8],
  },
  productBadgeRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
  },
  productName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    lineHeight: 22,
    minHeight: 44,
    textAlign: "right",
  },
  productVendor: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  productBottom: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    marginTop: 2,
  },
  productPrice: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
    fontSize: theme.typography.body.lg,
    textAlign: "right",
  },
  productStock: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    marginTop: 2,
    textAlign: "right",
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 24,
  },
});
