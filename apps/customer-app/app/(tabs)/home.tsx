import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { CustomerProductCard } from "../../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  buildPharmacyCategoryTree,
  getCategoryIcon,
  getCategoryTheme,
  getPharmacyCategoryProductCount,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";
import type { ComponentProps } from "react";

type IconName = ComponentProps<typeof Ionicons>["name"];

const promotionBanners = [
  {
    kicker: "عروض اليوم",
    title: "مستلزماتك الصحية من صيدليات موثوقة",
    text: "تسوق براحة وتجربة صيدلية رقمية أنيقة.",
  },
  {
    kicker: "توصيل سريع",
    title: "منتجات العناية والفيتامينات بالقرب منك",
    text: "صيدليات مختارة وتوفر واضح قبل الطلب.",
  },
  {
    kicker: "اختيارات مميزة",
    title: "تصفح المنتجات حسب احتياجك اليومي",
    text: "عناية، أدوية، مكملات ومنتجات طبية.",
  },
];

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

function getVendorDeliveryFee(vendor: unknown) {
  if (!vendor || typeof vendor !== "object" || !("delivery_fee" in vendor)) {
    return 0;
  }

  const deliveryFee = vendor.delivery_fee;
  return typeof deliveryFee === "number" ? deliveryFee : 0;
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const [search, setSearch] = useState("");
  const { data: catalog, loading, error, reload } = useCustomerCatalogData();

  function openSearch() {
    const query = search.trim();
    
    router.push({
      pathname: "/search",
      params: query ? { query } : {},
    });
  }

  const promotedVendor = catalog.vendors[0] ?? null;
  const activeBanner = promotionBanners[activeBannerIndex];

  const parentCategories = useMemo(
    () => buildPharmacyCategoryTree(catalog.categories).parents,
    [catalog.categories],
  );

  const promotedVendorImage = useMemo(
    () => (promotedVendor ? promotedVendor.image_url ?? getVendorImage(catalog.products, promotedVendor.id) : null),
    [catalog.products, promotedVendor],
  );

  const availableProducts = useMemo(() => {
  return catalog.products.filter((product) => (product.stock_quantity ?? 0) > 0).slice(0, 10);
}, [catalog.products]);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % promotionBanners.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

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
          <Text style={styles.heroKicker}>{activeBanner.kicker}</Text>
          <Text style={styles.heroTitle} numberOfLines={2}>
            {activeBanner.title}
          </Text>
          <Text style={styles.heroText} numberOfLines={1}>
            {promotedVendor ? `ابدأ من ${promotedVendor.name}` : activeBanner.text}
          </Text>

          <View style={styles.heroDots}>
            {promotionBanners.map((banner, index) => (
              <View key={banner.kicker} style={[styles.heroDot, index === activeBannerIndex ? styles.heroDotActive : null]} />
            ))}
          </View>
        </View>

        <CatalogImage
          uri={promotedVendorImage}
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
            <Text style={styles.sectionHint}>اختصر الوصول حسب نوع المنتج</Text>

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
            <Text style={styles.sectionHint}>منتجات جاهزة للطلب والتوصيل</Text>

            {availableProducts.length === 0 ? (
              <EmptyCard title="لا توجد منتجات مطابقة" message="جرّب البحث باسم آخر أو تصفح الفئات." />
            ) : (
              <ScrollView
  horizontal
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={styles.productsRow}
  style={styles.productsScroller}
>
                {availableProducts.map((product) => (
                  <CustomerProductCard
                    key={product.id}
                    product={product}
                    vendors={catalog.vendors}
                    width={138}
                    style={styles.productCard}
                  />
                ))}
              </ScrollView>
            )}
          </View>

          <View style={styles.sectionBlock}>
            <SectionTitle label="الصيدليات" />
            <Text style={styles.sectionHint}>تصفح منتجات صيدلية محددة</Text>

            {catalog.vendors.length === 0 ? (
              <EmptyCard
                title="لا توجد صيدليات متاحة الآن"
                message="ستظهر الصيدليات هنا بمجرد توفر متاجر معتمدة ونشطة."
                action={<PrimaryButton label="إعادة المحاولة" onPress={() => void reload()} />}
              />
            ) : (
              <View style={styles.pharmacyList}>
                {catalog.vendors.map((vendor) => {
                  const summary = getVendorSummary(vendor, catalog.products);
                  const vendorImage = vendor.image_url ?? getVendorImage(catalog.products, vendor.id);

                  return (
                    <Pressable
                      key={vendor.id}
                      style={styles.pharmacyCard}
                      onPress={() =>
                        router.push({
                          pathname: "/pharmacies/[pharmacyId]",
                          params: { pharmacyId: vendor.id },
                        })
                      }
                    >
                      <CatalogImage
                        uri={vendorImage}
                        alt={vendor.name}
                        fallbackLabel="صيدلية"
                        containerStyle={styles.pharmacyImageWrap}
                        imageStyle={styles.pharmacyImage}
                      />

                      <View style={styles.pharmacyBody}>
                        <View style={styles.pharmacyHeaderRow}>
                          <Text style={styles.pharmacyName} numberOfLines={1}>
                            {vendor.name}
                          </Text>

                          <Text style={styles.pharmacyLocation} numberOfLines={1}>
                            {vendor.address || "موقع غير محدد"}
                          </Text>
                        </View>

                        <View style={styles.pharmacyInfoRow}>
                          <View style={styles.infoItem}>
                            <Ionicons name="star" size={12} color="#9A6500" />
                            <Text style={styles.infoText}>{summary.ratingLabel}</Text>
                          </View>

                          <View style={styles.infoItem}>
                            <Ionicons name="bicycle-outline" size={12} color={theme.colors.primaryDark} />

                            <Text style={styles.infoText}>
                              {getVendorDeliveryFee(vendor) > 0 ? `${getVendorDeliveryFee(vendor)} د.ل` : "مجاني"}
                            </Text>
                          </View>
                        </View>
                      </View>
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
    minHeight: 112,
    borderRadius: 24,
    padding: theme.spacing[16],
    backgroundColor: "#DFF3E8",
    borderWidth: 1,
    borderColor: "#C9E8D5",
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[12],
    overflow: "hidden",
  },
  heroCopy: {
    flex: 1,
    gap: 5,
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
    lineHeight: 24,
    fontWeight: "900",
    textAlign: "right",
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  heroDots: {
    flexDirection: "row-reverse",
    gap: 5,
    marginTop: 2,
  },
  heroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(18,114,68,0.22)",
  },
  heroDotActive: {
    width: 18,
    backgroundColor: theme.colors.primaryDark,
  },
  heroImageWrap: {
    width: 86,
    height: 82,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.7)",
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
  marginTop: theme.spacing[18],
  marginHorizontal: -16,
  paddingHorizontal: 16,
  paddingVertical: 14,
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
    minHeight: 112,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[8],
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    marginBottom: theme.spacing[8],
  },
  categoryIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
  gap: theme.spacing[10],
  paddingBottom: 2,
  paddingHorizontal: 2,
},
  productCard: {
    transform: [{ scaleX: -1 }],
  },
  productsScroller: {
    transform: [{ scaleX: -1 }],
  },

  pharmacyList: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  pharmacyCard: {
    width: "48%",
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: "hidden",
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  pharmacyImageWrap: {
    width: "100%",
    aspectRatio: 1.25,
    borderRadius: 0,
  },
  pharmacyImage: {
    width: "100%",
    height: "100%",
  },
  pharmacyBody: {
    padding: theme.spacing[12],
    gap: theme.spacing[8],
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacySubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  pharmacyInfoRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
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
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: theme.colors.accent,
  },
  statusPillText: {
    color: theme.colors.primaryDark,
    fontSize: 10,
    fontWeight: "900",
  },
  pharmacyHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  pharmacyLocation: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
    flexShrink: 1,
  },
});
