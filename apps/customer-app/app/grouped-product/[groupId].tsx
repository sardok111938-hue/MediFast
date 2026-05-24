import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, Screen } from "../../src/components/CustomerUI";
import { addProductToCart } from "../../src/lib/cart-store";
import {
  calculateDistanceKm,
  formatDistanceKm,
  getGroupedProductById,
  getPrimaryAddress,
  useGroupedCustomerProducts,
} from "../../src/lib/customer-catalog";
import { DEFAULT_DELIVERY_FEE_ESTIMATE } from "../../src/features/checkout/cod-checkout";
import { formatCustomerCurrency } from "../../src/features/orders/customer-orders";
import type { ProductOffer } from "../../src/lib/customer-catalog";

function compareOffersByPrice(a: ProductOffer, b: ProductOffer) {
  return a.product.price - b.product.price;
}

export default function GroupedProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ groupId?: string | string[] }>();
  const groupId = Array.isArray(params.groupId) ? params.groupId[0] : params.groupId;
  const { data, groupedProducts, loading, error, reload } = useGroupedCustomerProducts();
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const product = getGroupedProductById(groupedProducts, groupId);
  const primaryAddress = getPrimaryAddress(data.addresses, data.defaultAddressId);

  const offers = useMemo(
    () => (product ? [...product.offers].sort(compareOffersByPrice) : []),
    [product],
  );

  if (loading) {
    return (
      <Screen title="" subtitle="" backHref="/search" backLabel="">
        <LoadingCard message="جارٍ تحميل المنتج..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="" subtitle="" backHref="/search" backLabel="">
        <ErrorCard message={error} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen title="" subtitle="" backHref="/search" backLabel="">
        <EmptyCard
          title="المنتج غير متاح"
          message="لم نتمكن من العثور على هذا المنتج في السوق حالياً."
          action={<Pressable style={styles.emptyButton} onPress={() => router.push("/search")}>
            <Text style={styles.emptyButtonText}>العودة إلى البحث</Text>
          </Pressable>}
        />
      </Screen>
    );
  }

  return (
    <Screen title="" subtitle="" backHref="/search" backLabel="" contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <CatalogImage
          uri={product.image_url}
          alt={product.name}
          fallbackLabel="منتج"
          containerStyle={styles.heroImageWrap}
          imageStyle={styles.heroImage}
          resizeMode="contain"
        />

        <View style={styles.heroBody}>
          <Text style={styles.productName}>{product.name}</Text>

          <View style={styles.summaryRow}>
            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>يبدأ من</Text>
              <Text style={styles.summaryValue}>{formatCustomerCurrency(product.lowestPrice)}</Text>
            </View>

            <View style={styles.summaryPill}>
              <Text style={styles.summaryLabel}>متوفر في</Text>
              <Text style={styles.summaryValue}>{product.pharmaciesCount} صيدليات</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Available from</Text>
        <Text style={styles.sectionHint}>اختر الصيدلية المناسبة وأضف المنتج إلى السلة</Text>
      </View>

      <View style={styles.offerList}>
        {offers.map((offer) => {
          const vendor = offer.vendor;
          const distanceKm = calculateDistanceKm(primaryAddress, vendor);
          const stockQuantity = offer.product.stock_quantity ?? 0;
          const inStock = stockQuantity > 0;
          const isAdded = addedProductId === offer.product.id;

          return (
            <View key={offer.product.id} style={styles.offerCard}>
              <View style={styles.offerMain}>
                <Text style={styles.vendorName} numberOfLines={1}>
                  {vendor?.name ?? "صيدلية"}
                </Text>

                <View style={styles.offerMetaGrid}>
                  <View style={styles.metaItem}>
                    <Ionicons name="pricetag-outline" size={14} color={theme.colors.primaryDark} />
                    <Text style={styles.metaText}>{formatCustomerCurrency(offer.product.price)}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="cube-outline" size={14} color={inStock ? theme.colors.primaryDark : theme.colors.danger} />
                    <Text style={[styles.metaText, !inStock ? styles.metaTextDanger : null]}>
                      {inStock ? `المخزون ${stockQuantity}` : "غير متوفر"}
                    </Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                    <Text style={styles.metaText}>{formatDistanceKm(distanceKm)}</Text>
                  </View>

                  <View style={styles.metaItem}>
                    <Ionicons name="bicycle-outline" size={14} color={theme.colors.muted} />
                    <Text style={styles.metaText}>
                      التوصيل {formatCustomerCurrency(DEFAULT_DELIVERY_FEE_ESTIMATE)}
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={[
                  styles.addButton,
                  isAdded ? styles.addButtonAdded : null,
                  !inStock ? styles.addButtonDisabled : null,
                ]}
                disabled={!inStock}
                onPress={() => {
                  addProductToCart(offer.product, 1);
                  setAddedProductId(offer.product.id);

                  setTimeout(() => {
                    setAddedProductId(null);
                  }, 900);
                }}
              >
                <Ionicons name={isAdded ? "checkmark" : "add"} size={16} color="#FFFFFF" />
                <Text style={styles.addButtonText}>
                  {isAdded ? "تمت الإضافة" : "Add to cart"}
                </Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    gap: theme.spacing[16],
    paddingBottom: 120,
  },
  heroCard: {
    borderRadius: 30,
    backgroundColor: "#FFFFFF",
    padding: theme.spacing[12],
    gap: theme.spacing[12],
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 3,
  },
  heroImageWrap: {
    width: "100%",
    height: 230,
    borderRadius: 24,
    backgroundColor: "#F3FAF6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  heroBody: {
    alignItems: "flex-end",
    gap: theme.spacing[12],
  },
  productName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "900",
    lineHeight: 30,
    textAlign: "right",
  },
  summaryRow: {
    width: "100%",
    flexDirection: "row-reverse",
    gap: theme.spacing[8],
  },
  summaryPill: {
    flex: 1,
    borderRadius: 20,
    backgroundColor: "#EAF7EF",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    alignItems: "flex-end",
    gap: 3,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
  },
  summaryValue: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "right",
  },
  sectionHeader: {
    alignItems: "flex-end",
    gap: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  offerList: {
    gap: theme.spacing[12],
  },
  offerCard: {
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: theme.spacing[12],
    gap: theme.spacing[12],
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  offerMain: {
    alignItems: "flex-end",
    gap: theme.spacing[8],
  },
  vendorName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  offerMetaGrid: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  metaItem: {
    minHeight: 32,
    borderRadius: 999,
    backgroundColor: "#F7FBF8",
    paddingHorizontal: theme.spacing[8],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
  },
  metaTextDanger: {
    color: theme.colors.danger,
  },
  addButton: {
    minHeight: 46,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  addButtonAdded: {
    backgroundColor: "#15803D",
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "center",
  },
  emptyButton: {
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing[16],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
  },
});
