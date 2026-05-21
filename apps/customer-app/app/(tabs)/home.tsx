import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { CustomerProductCard } from "../../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  listCustomerFavoriteVendorIds,
  toggleCustomerFavoriteVendor,
} from "../../src/lib/vendor-favorites";
import {
  buildPharmacyCategoryTree,
  getCategoryIcon,
  getCategoryTheme,
  getPharmacyCategoryProductCount,
  useCustomerCatalogData,
  calculateDistanceKm,
  formatDistanceKm,
  getPrimaryAddress,
  isVendorWithinDeliveryRadius,
} from "../../src/lib/customer-catalog";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

const heroContent = {
  title: "اطلب دواءك بسهولة",
  subtitle: "صيدليات موثوقة وتوصيل سريع",
  image:
    "https://static.wixstatic.com/media/11062b_fa8407d9fd264511b7461f607519747c~mv2.jpg/v1/fill/w_740,h_493,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/11062b_fa8407d9fd264511b7461f607519747c~mv2.jpg",
};

function getVendorProducts<T extends { vendor_id: string }>(products: T[], vendorId: string) {
  return products.filter((product) => product.vendor_id === vendorId);
}

function getVendorImage(products: { vendor_id: string; image_url?: string | null }[], vendorId: string) {
  return getVendorProducts(products, vendorId).find((product) => product.image_url)?.image_url ?? null;
}

function getVendorSummary(vendor: { id: string; rating: number }, products: { vendor_id: string }[]) {
  const vendorProducts = getVendorProducts(products, vendor.id);

  return {
    productCount: vendorProducts.length,
    ratingLabel: vendor.rating > 0 ? vendor.rating.toFixed(1) : "جديد",
  };
}


export default function HomeScreen() {
  const router = useRouter();
  const productsScrollRef = useRef<ScrollView>(null);
  const [search, setSearch] = useState("");
  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>([]);
  const { data: catalog, loading, error, reload } = useCustomerCatalogData();

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
  if (!loading && !catalog.defaultAddressId) {
    router.replace("/address/setup");
  }
}, [loading, catalog.defaultAddressId, router]);

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
const heroIllustrationUrl = heroContent.image;
const parentCategories = useMemo(
    () => buildPharmacyCategoryTree(catalog.categories).parents,
    [catalog.categories],
  );

  const availableProducts = useMemo(() => {
    
    return catalog.products.filter((product) => (product.stock_quantity ?? 0) > 0).slice(0, 10);
  }, [catalog.products]);

  return (
    <Screen title="" subtitle="">
      <Pressable
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
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {heroContent.title}
          </Text>
<Text style={styles.heroText} numberOfLines={1}>
  {catalog.vendors.length} {heroContent.subtitle}
</Text>
        </View>

        <CatalogImage
          uri={heroIllustrationUrl}
          alt={promotedVendor?.name ?? "صيدلية"}
          fallbackLabel="MediFast"
          containerStyle={styles.heroImageWrap}
          imageStyle={styles.heroImage}
        />
      </Pressable>

      <View style={styles.searchBox}>
        <Pressable onPress={openSearch}>
          <Ionicons name="search-outline" size={20} color={theme.colors.muted} />
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
            <SectionTitle label="تصفح حسب الفئة" />

            {parentCategories.length === 0 ? (
              <EmptyCard title="لا توجد فئات متاحة" message="ستظهر الفئات الرئيسية عند تفعيلها في لوحة الإدارة." />
            ) : (
              <View style={styles.categoryGrid}>
                {parentCategories.map((category) => {
                  const productCount = getPharmacyCategoryProductCount(catalog.products, catalog.categories, category.id);
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

                      <Text style={[styles.categoryDescription, { color: categoryTheme.accent }]} numberOfLines={1}>
                        {category.subcategories.length} أقسام · {productCount} منتجات
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.productsSection}>
            <SectionTitle label="منتجات متوفرة الآن" actionLabel="عرض الكل" onAction={() => router.push("/search")} />

            {availableProducts.length === 0 ? (
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
                {availableProducts.map((product) => (
                  <CustomerProductCard
                    key={product.id}
                    product={product}
                    vendors={catalog.vendors}
                    width={126}
                    style={styles.productCard}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle label="الصيدليات" />

            {catalog.vendors.length === 0 ? (
              <EmptyCard
                title="لا توجد صيدليات متاحة الآن"
                message="ستظهر الصيدليات هنا بمجرد توفر متاجر معتمدة ونشطة."
                action={<PrimaryButton label="إعادة المحاولة" onPress={() => void reload()} />}
              />
            ) : (
              <View style={styles.pharmacyList}>
                {sortedVendors.map((vendor) => {
                  const summary = getVendorSummary(vendor, catalog.products);
                  const vendorImage = vendor.image_url ?? getVendorImage(catalog.products, vendor.id);
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
  <Ionicons
    name="chevron-back"
    size={22}
    color={theme.colors.muted}
  />
) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}
          </View>
        </>
      ) : null}
    </Screen>
  );
}


const styles = StyleSheet.create({
  heroBanner: {
    minHeight: 96,
    borderRadius: 24,
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[16],
    backgroundColor: "#ECF8F1",
    borderWidth: 1,
    borderColor: "#D7ECDD",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[12],
    overflow: "hidden",
  },
  heroCopy: {
    flex: 1,
    gap: 8,
  },
  heroKicker: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
    textAlign: "right",
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    lineHeight: 23,
    fontWeight: "900",
    textAlign: "right",
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  heroImageWrap: {
    width: 120,
    height: 130,
    borderRadius: 30,
    backgroundColor: "rgba(255,255,255,0.82)",
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  searchBox: {
    minHeight: 54,
    marginTop: theme.spacing[12],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[12],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[8],
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    paddingVertical: theme.spacing[12],
  },
  sectionBlock: {
    marginTop: theme.spacing[20],
  },
  productsSection: {
    marginTop: theme.spacing[16],
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: "#F7FAF8",
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textAlign: "right",
    marginTop: -6,
    marginBottom: theme.spacing[8],
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "31%",
    minHeight: 88,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing[8],
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    marginBottom: theme.spacing[8],
  },
  categoryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryTitle: {
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    lineHeight: 17,
    textAlign: "center",
  },
  categoryDescription: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  productsRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
    paddingBottom: 2,
    paddingHorizontal: 2,
  },
  productCard: {},
  productsScroller: {},

  pharmacyList: {
    gap: theme.spacing[12],
  },
  pharmacyCard: {
    width: "100%",
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    borderWidth: 1,
    position: "relative",
    borderColor: theme.colors.border,
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: 10,
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  pharmacyImageWrap: {
    width: 108,
    height: 92,
    borderRadius: 16,
    backgroundColor: "#F7FAF8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  pharmacyImage: {
    width: "100%",
    height: "100%",
  },
  pharmacyBody: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    minHeight: 92,
  },
  pharmacyDetails: {
    flex: 1,
    alignItems: "flex-end",
    gap: 5,
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacyInfoColumn: {
    alignItems: "flex-end",
    gap: 2,
  },
  infoItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
  },
  infoText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  productCountText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: theme.colors.accent,
  },
  statusPillText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  statusPillClosed: {
    backgroundColor: "#F2F2F2",
  },
  statusPillTextClosed: {
    color: theme.colors.muted,
  },
  pharmacyMetaRail: {
    alignItems: "flex-start",
    gap: theme.spacing[8],
    minWidth: 88,
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },
  pharmacyLocation: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
  distanceText: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "right",
  },
  pharmacyImageShell: {
    position: "relative",
    width: 108,
    height: 92,
    borderRadius: 16,
    overflow: "hidden",
  },

  pharmacyImageMuted: {
    opacity: 0.58,
  },

  pharmacyImageClosed: {
    opacity: 0.48,
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
  backgroundColor: "rgba(255,255,255,0.86)",
  paddingHorizontal: 10,
  paddingVertical: 3,
  borderRadius: 999,
  overflow: "hidden",
},
  pharmacyCardDisabled: {
    opacity: 0.82,
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
    fontSize: 14,
    fontWeight: "900",
    backgroundColor: "rgba(255,255,255,0.88)",
    paddingHorizontal: 18,
    paddingVertical: 6,
    minWidth: 136,
    textAlign: "center",
    overflow: "hidden",
  },
  
  favoriteVendorButton: {
  position: "absolute",
  top: 7,
  left: 7,
  zIndex: 40,

  width: 32,
  height: 32,
  borderRadius: 17,

  backgroundColor: "rgba(255,255,255,0.96)",

  alignItems: "center",
  justifyContent: "center",

  shadowColor: "#000",
  shadowOpacity: 0.10,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 3 },

  elevation: 3,
},
});
