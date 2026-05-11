import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import type { Product, Vendor } from "@medifast/types";
import { CatalogImage } from "../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import { useCustomerCatalogData } from "../src/lib/customer-catalog";

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
    title: "تصفح الصيدليات حسب احتياجك اليومي",
    text: "عناية، أدوية، مكملات ومنتجات طبية.",
  },
];

function getVendorProducts(products: Product[], vendorId: string) {
  return products.filter((product) => product.vendor_id === vendorId);
}

function getVendorImage(products: Product[], vendorId: string) {
  return getVendorProducts(products, vendorId).find((product) => product.image_url)?.image_url ?? null;
}

function getVendorSummary(vendor: Vendor, products: Product[]) {
  const vendorProducts = getVendorProducts(products, vendor.id);
  const categoryCount = new Set(vendorProducts.map((product) => product.category_id).filter(Boolean)).size;

  return {
    productCount: vendorProducts.length,
    categoryCount,
    etaLabel: vendor.eta_minutes > 0 ? `${vendor.eta_minutes} دقيقة` : "30-45 دقيقة",
    ratingLabel: vendor.rating > 0 ? vendor.rating.toFixed(1) : "جديد",
  };
}

export default function HomeScreen() {
  const router = useRouter();
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  const { data: catalog, loading, error, reload } = useCustomerCatalogData();
  const promotedVendor = catalog.vendors[0] ?? null;
  const activeBanner = promotionBanners[activeBannerIndex];
  const promotedVendorImage = useMemo(
  () => (promotedVendor ? promotedVendor.image_url ?? getVendorImage(catalog.products, promotedVendor.id) : null),
  [catalog.products, promotedVendor],
);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveBannerIndex((current) => (current + 1) % promotionBanners.length);
    }, 4200);

    return () => clearInterval(timer);
  }, []);

  return (
    <Screen title="الرئيسية" subtitle="صيدليات قريبة ومنتجات صحية تصل إليك بسرعة.">
      <View style={styles.favoriteRow}>
        <Pressable style={styles.favoriteButton} onPress={() => router.push("/profile")}>
          <Ionicons name="heart-outline" size={21} color={theme.colors.primaryDark} />
        </Pressable>
      </View>

      <Pressable
        style={styles.heroBanner}
        onPress={() =>
          router.push(
            promotedVendor
              ? {
                  pathname: "/pharmacies/[pharmacyId]",
                  params: { pharmacyId: promotedVendor.id },
                }
              : "/product-listing",
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

      {loading ? <LoadingCard message="جارٍ تحميل الصيدليات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      {!loading && !error ? (
        <>
          <SectionTitle label="الصيدليات" />
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
                    <CatalogImage uri={vendorImage} alt={vendor.name} fallbackLabel="صيدلية" containerStyle={styles.pharmacyImageWrap} imageStyle={styles.pharmacyImage} />

                    <View style={styles.pharmacyBody}>
                      <View style={styles.pharmacyTopRow}>
                        <View style={styles.pharmacyCopy}>
                          <Text style={styles.pharmacyName} numberOfLines={1}>
                            {vendor.name}
                          </Text>
                          <Text style={styles.pharmacySubtitle} numberOfLines={1}>
                            {vendor.address || "صيدلية معتمدة"}
                          </Text>
                        </View>
                        <View style={styles.statusPill}>
                          <Text style={styles.statusPillText}>{vendor.is_open ? "مفتوحة" : "غير متاحة"}</Text>
                        </View>
                        <Pressable
                          style={styles.cardFavoriteButton}
                          onPress={(event) => {
                            event.stopPropagation();
                            router.push("/profile");
                          }}
                        >
                          <Ionicons name="heart-outline" size={17} color={theme.colors.primaryDark} />
                        </Pressable>
                      </View>

                      <View style={styles.pharmacyMeta}>
                        <View style={styles.metaItem}>
                          <Ionicons name="star" size={13} color="#9A6500" />
                          <Text style={styles.metaText}>{summary.ratingLabel}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="time-outline" size={13} color={theme.colors.primaryDark} />
                          <Text style={styles.metaText}>{summary.etaLabel}</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="cube-outline" size={13} color={theme.colors.primaryDark} />
                          <Text style={styles.metaText}>{summary.productCount} منتج</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="bicycle-outline" size={13} color={theme.colors.primaryDark} />
                          <Text style={styles.metaText}>حسب العنوان</Text>
                        </View>
                        <View style={styles.metaItem}>
                          <Ionicons name="navigate-outline" size={13} color={theme.colors.info} />
                          <Text style={styles.metaText}>قريبة منك</Text>
                        </View>
                      </View>

                      <View style={styles.openRow}>
                        <Text style={styles.openText}>{summary.categoryCount > 0 ? `${summary.categoryCount} فئات متاحة` : "افتح الصيدلية للتصفح"}</Text>
                        <Ionicons name="chevron-back" size={18} color={theme.colors.primaryDark} />
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  favoriteRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
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
  pharmacyList: {
    gap: theme.spacing[16],
  },
  pharmacyCard: {
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
    height: 118,
    borderRadius: 0,
  },
  pharmacyImage: {
    width: "100%",
    height: "100%",
  },
  pharmacyBody: {
    padding: theme.spacing[16],
    gap: theme.spacing[12],
  },
  pharmacyTopRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  pharmacyCopy: {
    flex: 1,
    gap: 4,
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacySubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 6,
    backgroundColor: theme.colors.accent,
  },
  statusPillText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  cardFavoriteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  pharmacyMeta: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    borderRadius: 999,
    backgroundColor: "#F5FBF7",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#E2F0E7",
  },
  metaText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  openRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: "#EEF5F0",
  },
  openText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
    textAlign: "right",
  },
});
