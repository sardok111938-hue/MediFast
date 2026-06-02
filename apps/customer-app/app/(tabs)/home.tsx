import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  listCustomerFavoriteVendorIds,
  toggleCustomerFavoriteVendor,
} from "../../src/features/favorites/vendor-favorites";

import {
  buildPharmacyCategoryTree,
  getCategoryIcon,
  getCategoryTheme,
  useGroupedCustomerProducts,
  calculateDistanceKm,
  formatDistanceKm,
  getPrimaryAddress,
  isVendorWithinDeliveryRadius,
} from "../../src/lib/customer-catalog";
import type { ComponentProps } from "react";
import type { GroupedProduct } from "../../src/lib/customer-catalog";

type IconName = ComponentProps<typeof Ionicons>["name"];

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function GroupedProductCard({
  product,
  onPress,
}: {
  product: GroupedProduct;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.groupedProductCard,
        pressed ? styles.pressedSoft : null,
      ]}
      onPress={onPress}
    >
      <CatalogImage
        uri={product.image_url}
        alt={product.name}
        fallbackLabel="منتج"
        containerStyle={styles.groupedProductImageWrap}
        imageStyle={styles.groupedProductImage}
        resizeMode="contain"
      />

      <View style={styles.groupedProductBody}>
        <Text style={styles.groupedProductName} numberOfLines={2}>
          {product.name}
        </Text>

        <Text style={styles.groupedProductPrice} numberOfLines={1}>
          يبدأ من {formatPrice(product.lowestPrice)} د.ل
        </Text>

        <Text style={styles.groupedProductMeta} numberOfLines={1}>
          متوفر في {product.pharmaciesCount} صيدليات
        </Text>
      </View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const productsScrollRef = useRef<ScrollView>(null);
  const [search, setSearch] = useState("");
  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>([]);
  const { data: catalog, groupedProducts, loading, error, reload } = useGroupedCustomerProducts();

  const primaryAddress = getPrimaryAddress(
  catalog.addresses,
  catalog.defaultAddressId,
);

const sortedVendors = useMemo(() => {
  return [...catalog.vendors].sort((a, b) => {
  const aFavorite = favoriteVendorIds.includes(a.id);
  const bFavorite = favoriteVendorIds.includes(b.id);

  if (aFavorite !== bFavorite) {
    return aFavorite ? -1 : 1;
  }

  const distanceA = calculateDistanceKm(primaryAddress, a);
  const distanceB = calculateDistanceKm(primaryAddress, b);

  const aWithinRadius = isVendorWithinDeliveryRadius(primaryAddress, a);
  const bWithinRadius = isVendorWithinDeliveryRadius(primaryAddress, b);

  if (aWithinRadius !== bWithinRadius) {
    return aWithinRadius ? -1 : 1;
  }

  if (a.is_open !== b.is_open) {
    return a.is_open ? -1 : 1;
  }

  if (distanceA === null) return 1;
  if (distanceB === null) return -1;

  return distanceA - distanceB;
  });
}, [catalog.vendors, favoriteVendorIds, primaryAddress]);

useEffect(() => {
  if (loading || error) {
    return;
  }

  const hasUsableDefaultAddress = Boolean(
    catalog.defaultAddressId &&
      catalog.addresses.some((address) => address.id === catalog.defaultAddressId),
  );

  console.log("HOME ADDRESS DEBUG", {
  loading,
  error,
  defaultAddressId: catalog.defaultAddressId,
  addressCount: catalog.addresses.length,
  addressIds: catalog.addresses.map((a) => a.id),
  hasUsableDefaultAddress,
});

  if (!hasUsableDefaultAddress) {
    router.replace("/address/setup");
  }
}, [loading, error, catalog.defaultAddressId, catalog.addresses, router]);

useEffect(() => {
  async function loadFavoriteVendors() {
    try {
      const ids = await listCustomerFavoriteVendorIds();
      setFavoriteVendorIds(ids);
    } catch (error) {
      console.log("LOAD_VENDOR_FAVORITES_ERROR", error);
    }
  }

  void loadFavoriteVendors();
}, []);

  function openSearch() {
    const query = search.trim();

    router.push({
      pathname: "/search",
      params: query ? { query } : {},
    });
  }

const promotedVendor = catalog.vendors[0] ?? null;
const parentCategories = useMemo(
    () => buildPharmacyCategoryTree(catalog.categories).parents,
    [catalog.categories],
  );

  const recentGroupedProducts = useMemo(() => groupedProducts.slice(0, 10), [groupedProducts]);

  return (
    <Screen title="" subtitle="" contentContainerStyle={styles.screenContent}>
<View style={styles.topToolbar}>
  <Pressable onPress={() => router.push("/favorite-pharmacies")}>
    <Ionicons name="heart-outline" size={24} color="#E5484D" />
  </Pressable>

  <Pressable onPress={() => router.push("/prescriptions/new")}>
    <Ionicons
      name="document-text-outline"
      size={24}
      color={theme.colors.primaryDark}
    />
  </Pressable>

  <Pressable onPress={() => router.push("/notifications" as never)}>
    <Ionicons
      name="notifications-outline"
      size={24}
      color="#D97706"
    />
  </Pressable>

  <Pressable onPress={() => router.push("/cart")}>
    <Ionicons
      name="cart-outline"
      size={24}
      color="#1E9A58"
    />
  </Pressable>
</View><Pressable
  style={styles.heroBanner}
  onPress={() =>
    router.push(
      promotedVendor
        ? {
            pathname: "/pharmacies/[pharmacyId]",
            params: { pharmacyId: promotedVendor.id },
          }
        : "/search",
    )
  }
>
  <Image
    source={require("../../assets/images/hero-banner.png")}
    style={styles.heroBannerImage}
    resizeMode="cover"
  />
</Pressable>

      <View style={styles.searchBox}>
        <Pressable onPress={openSearch} style={styles.searchIconWrap}>
          <Ionicons name="search-outline" size={21} color={theme.colors.primaryDark} />
        </Pressable>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="ابحث عن دواء أو منتج"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
          textAlign="right"
          returnKeyType="search"
          onSubmitEditing={openSearch}
        />
      </View>

      {loading ? <LoadingCard message="جارٍ تحميل المنتجات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      {!loading && !error ? (
        <>
          <View style={styles.sectionBlock}>
            <SectionTitle label="الأقسام الرئيسية" />

            {parentCategories.length === 0 ? (
              <EmptyCard title="لا توجد فئات متاحة" message="ستظهر الفئات الرئيسية عند تفعيلها في لوحة الإدارة." />
            ) : (
              <View style={styles.categoryGrid}>
                {parentCategories.map((category) => {
                  const categoryTheme = getCategoryTheme(category.category.slug);

                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: categoryTheme.background,
                          borderColor: categoryTheme.border,
                        },
                      ]}
                      onPress={() =>
                        router.push({
                          pathname: "/categories/[categoryId]",
                          params: { categoryId: category.id },
                        })
                      }
                    >
                      <View style={[styles.categoryIcon, { backgroundColor: categoryTheme.accentSoft }]}>
                        <Ionicons
                          name={getCategoryIcon(category.category.slug) as IconName}
                          size={22}
                          color={categoryTheme.accent}
                        />
                      </View>

                      <Text style={[styles.categoryTitle, { color: categoryTheme.text }]} numberOfLines={2}>
                        {category.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle label="صيدليات قريبة منك" />

            {catalog.vendors.length === 0 ? (
              <EmptyCard
                title="لا توجد صيدليات متاحة الآن"
                message="ستظهر الصيدليات هنا بمجرد توفر متاجر معتمدة ونشطة."
                action={<PrimaryButton label="إعادة المحاولة" onPress={() => void reload()} />}
              />
            ) : (
              <View style={styles.pharmacyList}>
                {sortedVendors.map((vendor) => {
                  const summary = {
  productCount: 0,
  ratingLabel: vendor.rating > 0 ? vendor.rating.toFixed(1) : "جديد",
};
                  const vendorImage = vendor.image_url ?? null;
                  const isFavoriteVendor = favoriteVendorIds.includes(vendor.id);
                  const primaryAddress = getPrimaryAddress(
                    catalog.addresses,
                    catalog.defaultAddressId,
                  );

                  const distanceKm = calculateDistanceKm(
                    primaryAddress,
                    vendor,
                  );

                  const withinRadius = isVendorWithinDeliveryRadius(
                    primaryAddress,
                    vendor,
                  );

                  return (
                    <Pressable
                      key={vendor.id}
                      style={[
                        styles.pharmacyCard,
                        !withinRadius || !vendor.is_open ? styles.pharmacyCardDisabled : null,
                      ]}
                      disabled={!withinRadius}
                      onPress={() =>
                        router.push({
                          pathname: "/pharmacies/[pharmacyId]",
                          params: { pharmacyId: vendor.id },
                        })
                      }
                    >
                      <View style={styles.pharmacyImageShell}>
                                                <Pressable
  hitSlop={10}
  style={styles.favoriteVendorButton}
  onPress={async (event) => {
    event.stopPropagation();

    try {
      const result = await toggleCustomerFavoriteVendor(vendor.id);

      setFavoriteVendorIds(result.favoriteVendorIds);
    } catch (error) {
      console.log("TOGGLE_VENDOR_FAVORITE_ERROR", error);
    }
  }}
>
  <Ionicons
    name={isFavoriteVendor ? "heart" : "heart-outline"}
    size={20}
    color={isFavoriteVendor ? "#E53935" : theme.colors.muted}
  />
</Pressable>
                        <CatalogImage
                          uri={vendorImage}
                          alt={vendor.name}
                          fallbackLabel="صيدلية"
                          containerStyle={[
                            styles.pharmacyImageWrap,
                            !withinRadius ? styles.pharmacyImageMuted : null,
                            !vendor.is_open ? styles.pharmacyImageClosed : null,
                          ]}
                          imageStyle={styles.pharmacyImage}
                        />

                        {!vendor.is_open ? (
                          <View style={styles.closedWatermark}>
                            <Text style={styles.closedWatermarkText}>مغلقة</Text>
                          </View>
                        ) : null}

                        {!withinRadius ? (
                          <View style={styles.outOfRangeOverlay}>
                            <Text style={styles.outOfRangeOverlayText}>
                              خارج نطاق التوصيل
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={styles.pharmacyBody}>
                        <View style={styles.pharmacyDetails}>
                          <Text style={styles.pharmacyName} numberOfLines={1}>
                            {vendor.name}
                          </Text>

                          <View style={styles.pharmacyInfoColumn}>
                            <View style={styles.infoItem}>
                              <Ionicons name="star" size={13} color="#F5A400" />
                              <Text style={styles.infoText}>{summary.ratingLabel}</Text>
                            </View>

                            <Text style={styles.productCountText}>
                              {summary.productCount} منتجات
                            </Text>
                          </View>
                        </View>

<View style={styles.pharmacyMetaRail}>
  <View style={[styles.statusPill, !vendor.is_open ? styles.statusPillClosed : null]}>
    <Text style={[styles.statusPillText, !vendor.is_open ? styles.statusPillTextClosed : null]}>
      {vendor.is_open ? "مفتوح الآن" : "مغلق الآن"}
    </Text>
  </View>

  <View style={styles.metaItem}>
    <Text style={styles.pharmacyLocation} numberOfLines={1}>
      {distanceKm !== null ? formatDistanceKm(distanceKm) : "—"}
    </Text>

    <Ionicons
      name="location"
      size={13}
      color={theme.colors.muted}
    />
  </View>

  <View style={styles.metaItem}>
    <Text style={styles.pharmacyLocation} numberOfLines={1}>
      {distanceKm === null
        ? "—"
        : distanceKm <= 3
          ? "3 د.ل"
          : distanceKm <= 8
            ? "5 د.ل"
            : distanceKm <= 15
              ? "8 د.ل"
              : "12 د.ل"}
    </Text>

    <Ionicons
      name="bicycle-outline"
      size={13}
      color={theme.colors.muted}
    />
  </View>
</View>
</View>

{withinRadius ? (
  <View style={styles.pharmacyChevron}>
    <Ionicons
      name="chevron-back"
      size={18}
      color={theme.colors.primaryDark}
    />
  </View>
) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.productsSection}>
            <SectionTitle label="أضيفت حديثاً" actionLabel="عرض الكل" onAction={() => router.push("/search")} />

            {recentGroupedProducts.length === 0 ? (
              <EmptyCard title="لا توجد منتجات مطابقة" message="جرّب البحث باسم آخر أو تصفح الفئات." />
            ) : (
              <ScrollView
                ref={productsScrollRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.productsRow}
                style={styles.productsScroller}
                onContentSizeChange={() => {
                  productsScrollRef.current?.scrollToEnd({ animated: false });
                }}
              >
                {recentGroupedProducts.map((product) => (
                  <GroupedProductCard
                    key={product.id}
                    product={product}
                    onPress={() =>
                      router.push({
                        pathname: "/grouped-product/[groupId]",
                        params: { groupId: product.id },
                      })
                    }
                  />
                ))}
              </ScrollView>
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}


const styles = StyleSheet.create({
  screenContent: {
    paddingBottom: 120,
  },
  pressedSoft: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  searchBox: {
    minHeight: 62,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  searchIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    paddingVertical: theme.spacing[12],
  },
  sectionBlock: {
    marginTop: theme.spacing[16],
    gap: theme.spacing[12],
  },
  categoryGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  categoryCard: {
    width: "23.5%",
    aspectRatio: 0.82,
    borderRadius: 24,
    borderWidth: 0,
    paddingVertical: 9,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  categoryIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  productsSection: {
    marginTop: theme.spacing[20],
    marginHorizontal: -20,
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: theme.spacing[12],
    backgroundColor: "#F7FBF8",
  },
  productsRow: {
    flexDirection: "row",
    gap: 14,
    paddingBottom: 8,
    paddingHorizontal: 2,
  },
  productsScroller: {
    marginHorizontal: -2,
  },
  groupedProductCard: {
    width: 156,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    padding: 10,
    gap: 10,
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  groupedProductImageWrap: {
    width: "100%",
    height: 104,
    borderRadius: 20,
    backgroundColor: "#F3FAF6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  groupedProductImage: {
    width: "100%",
    height: "100%",
  },
  groupedProductBody: {
    alignItems: "flex-end",
    gap: 5,
  },
  groupedProductName: {
    minHeight: 38,
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "right",
  },
  groupedProductPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "right",
  },
  groupedProductMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
  },
  pharmacyList: {
    gap: 14,
  },
  pharmacyCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 30,
    borderWidth: 0,
    position: "relative",
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 14,
    gap: 14,
    shadowColor: "#0F3D2E",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  },
  pharmacyImageShell: {
    position: "relative",
    width: 110,
    height: 104,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#F3FAF6",
  },
  pharmacyImageWrap: {
    width: 110,
    height: 104,
    borderRadius: 24,
    backgroundColor: "#F3FAF6",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pharmacyImage: {
    width: "100%",
    height: "100%",
  },
  favoriteVendorButton: {
    position: "absolute",
    top: 9,
    left: 9,
    zIndex: 40,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  pharmacyBody: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    minHeight: 100,
  },
  pharmacyDetails: {
    flex: 1,
    alignItems: "flex-end",
    gap: 8,
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacyInfoColumn: {
    alignItems: "flex-end",
    gap: 4,
  },
  infoItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#FFF8E8",
  },
  infoText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  productCountText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "right",
  },
  pharmacyMetaRail: {
    alignItems: "flex-start",
    gap: theme.spacing[8],
    minWidth: 92,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    backgroundColor: "#EAF7EF",
  },
  statusPillText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  statusPillClosed: {
    backgroundColor: "#F1F5F9",
  },
  statusPillTextClosed: {
    color: theme.colors.muted,
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  pharmacyLocation: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
  pharmacyChevron: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF7EF",
    alignItems: "center",
    justifyContent: "center",
  },
  pharmacyImageMuted: {
    opacity: 0.58,
  },
  pharmacyImageClosed: {
    opacity: 0.48,
  },
  pharmacyCardDisabled: {
    opacity: 0.82,
  },
  closedWatermark: {
    position: "absolute",
    top: "42%",
    left: 10,
    right: 10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  closedWatermarkText: {
    color: "#8A1F1F",
    fontSize: 14,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: "hidden",
  },
  outOfRangeOverlay: {
    position: "absolute",
    top: "35%",
    left: -10,
    right: -10,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-12deg" }],
  },
  outOfRangeOverlayText: {
    color: "#8A1F1F",
    fontSize: 13,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 132,
    textAlign: "center",
    overflow: "hidden",
  },
  heroBanner: {
  borderRadius: 34,
  overflow: "hidden",
  marginTop: -18,
  marginBottom: 14,

  shadowColor: "#0F3D2E",
  shadowOpacity: 0.10,
  shadowRadius: 24,
  shadowOffset: { width: 0, height: 12 },

  elevation: 4,
},

heroBannerImage: {
  width: "100%",
  height: 250,
},
topToolbar: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
},

topIconButton: {
  width: 50,
  height: 50,
  borderRadius: 25,
  backgroundColor: "#FFFFFF",

  alignItems: "center",
  justifyContent: "center",

  shadowColor: "#0F3D2E",
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: {
    width: 0,
    height: 8,
  },

  elevation: 3,
},
});
