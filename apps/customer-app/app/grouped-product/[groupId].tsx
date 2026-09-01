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
  const [showAllOffers, setShowAllOffers] = useState(false);
  const product = getGroupedProductById(groupedProducts, groupId);
  const primaryAddress = getPrimaryAddress(data.addresses, data.defaultAddressId);

  const offers = useMemo(() => {
    if (!product) {
      return [];
    }

    return [...product.offers].sort((a, b) => {
      const aDistance = calculateDistanceKm(primaryAddress, a.vendor);
      const bDistance = calculateDistanceKm(primaryAddress, b.vendor);

      const aOpen = a.vendor?.is_open ? 1 : 0;
      const bOpen = b.vendor?.is_open ? 1 : 0;

      if (aOpen !== bOpen) {
        return bOpen - aOpen;
      }

      if (a.product.price !== b.product.price) {
        return a.product.price - b.product.price;
      }

      if (aDistance === null) return 1;
      if (bDistance === null) return -1;

      return aDistance - bDistance;
    });
  }, [product, primaryAddress]);

  const visibleOffers = showAllOffers ? offers : offers.slice(0, 3);

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
          action={
            <Pressable style={styles.emptyButton} onPress={() => router.push("/search")}>
              <Text style={styles.emptyButtonText}>العودة إلى البحث</Text>
            </Pressable>
          }
        />
      </Screen>
    );
  }

  return (
    <Screen title="" subtitle="" contentContainerStyle={styles.screenContent}>
      <View style={styles.heroCard}>
        <View style={styles.heroOverlay}>
  <Pressable style={styles.heroIconButton} onPress={() => router.back()}>
    <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
  </Pressable>
</View>
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
        <Text style={styles.sectionHint}>اختر المتجر المناسب وأضف المنتج إلى السلة</Text>
      </View>

      <View style={styles.offerList}>
        {visibleOffers.map((offer) => {
          const vendor = offer.vendor;
          const distanceKm = calculateDistanceKm(primaryAddress, vendor);
          const stockQuantity = offer.product.stock_quantity ?? 0;
          const inStock = stockQuantity > 0;
          const isAdded = addedProductId === offer.product.id;

return (
  <View key={offer.product.id} style={styles.offerCard}>
    <View style={styles.offerTopRow}>
      <Pressable
        style={styles.offerPressArea}
        onPress={() =>
          router.push({
            pathname: "/product-detail",
            params: { productId: offer.product.id },
          })
        }
      >
        <Text style={styles.vendorName} numberOfLines={1}>
          {vendor?.name ?? "صيدلية"}
        </Text>

        <View style={styles.offerMetaRow}>
          <Text style={styles.metaText}>
            {formatCustomerCurrency(offer.product.price)}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={[styles.metaText, !inStock ? styles.metaTextDanger : null]}>
            {inStock ? `${stockQuantity} متوفر` : "غير متوفر"}
          </Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>{formatDistanceKm(distanceKm)}</Text>
          <Text style={styles.metaDot}>•</Text>
          <Text style={styles.metaText}>
            توصيل {formatCustomerCurrency(DEFAULT_DELIVERY_FEE_ESTIMATE)}
          </Text>
        </View>
      </Pressable>

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
      </Pressable>
    </View>
  </View>
);
})}
</View>

{offers.length > 3 && !showAllOffers ? (
  <Pressable style={styles.showMoreButton} onPress={() => setShowAllOffers(true)}>
    <Text style={styles.showMoreText}>
      عرض {offers.length - 3} متاجر إضافية
    </Text>
  </Pressable>
) : null}
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
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    gap: 6,
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  offerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  vendorName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  offerMetaRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "flex-start",
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
  metaDot: {
    color: "#CBD5E1",
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  addButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonAdded: {
    backgroundColor: "#15803D",
  },
  addButtonDisabled: {
    opacity: 0.45,
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
  heroOverlay: {
  position: "absolute",
  top: theme.spacing[12],
  left: theme.spacing[12],
  right: theme.spacing[12],
  zIndex: 20,
  flexDirection: "row-reverse",
  justifyContent: "space-between",
  alignItems: "center",
},

heroIconButton: {
  width: 42,
  height: 42,
  borderRadius: 21,
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(255,255,255,0.94)",
},
showMoreButton: {
  height: 48,
  borderRadius: 16,
  backgroundColor: "#EAF7EF",
  alignItems: "center",
  justifyContent: "center",
},

showMoreText: {
  color: theme.colors.primaryDark,
  fontSize: theme.typography.body.md,
  fontWeight: "900",
},
offerPressArea: {
  flex: 1,
  gap: 6,
},
});
