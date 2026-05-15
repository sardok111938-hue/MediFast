import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState, type ComponentProps } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import type { Product } from "@medifast/types";
import { CatalogImage } from "../../src/components/CatalogImage";
import { CustomerProductCard } from "../../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SearchInput, SectionTitle } from "../../src/components/CustomerUI";
import {
  getPharmacyCategoryImage,
  getPharmacyCategoryProductCount,
  getPharmacyParentCategoriesForProducts,
  getProductsForPharmacyParentCategory,
  getVendorById,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";

type IconName = ComponentProps<typeof Ionicons>["name"];

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

function getPharmacyProducts(products: Product[], pharmacyId?: string | null) {
  if (!pharmacyId) {
    return [];
  }

  return products.filter((product) => product.vendor_id === pharmacyId);
}

function filterByQuery(products: Product[], query: string) {
  const normalizedQuery = normalizeQuery(query);

  if (!normalizedQuery) {
    return products;
  }

  return products.filter(
    (product) =>
      normalizeQuery(product.name).includes(normalizedQuery) ||
      normalizeQuery(product.description).includes(normalizedQuery) ||
      normalizeQuery(product.barcode ?? "").includes(normalizedQuery),
  );
}

function getCoverImage(products: Product[]) {
  return products.find((product) => product.image_url)?.image_url ?? null;
}

export default function PharmacyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pharmacyId?: string | string[] }>();
  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [query, setQuery] = useState("");

  const pharmacy = useMemo(() => getVendorById(data.vendors, pharmacyId), [data.vendors, pharmacyId]);
  const pharmacyProducts = useMemo(() => getPharmacyProducts(data.products, pharmacyId), [data.products, pharmacyId]);
  const categoryCards = useMemo(() => getPharmacyParentCategoriesForProducts(pharmacyProducts, data.categories), [data.categories, pharmacyProducts]);
  const visibleProducts = useMemo(() => filterByQuery(pharmacyProducts, query), [pharmacyProducts, query]);
  const visibleCategorySections = useMemo(
    () => getPharmacyParentCategoriesForProducts(visibleProducts, data.categories),
    [data.categories, visibleProducts],
  );
  const coverImage = useMemo(
    () => pharmacy?.image_url ?? getCoverImage(pharmacyProducts),
    [pharmacy?.image_url, pharmacyProducts],
  );
  const ratingLabel = pharmacy && pharmacy.rating > 0 ? pharmacy.rating.toFixed(1) : "جديد";
  const etaLabel = pharmacy && pharmacy.eta_minutes > 0 ? `${pharmacy.eta_minutes} دقيقة` : "30-45 دقيقة";

  if (loading) {
    return (
      <Screen title="الصيدلية" subtitle="جارٍ تجهيز بيانات الصيدلية." backHref="/home" backLabel="العودة">
        <LoadingCard message="جارٍ تحميل الصيدلية..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="الصيدلية" subtitle="تعذر تحميل بيانات الصيدلية." backHref="/home" backLabel="العودة">
        <ErrorCard message={error} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!pharmacy) {
    return (
      <Screen title="الصيدلية" subtitle="هذه الصيدلية غير متاحة حاليًا." backHref="/home" backLabel="العودة">
        <EmptyCard
          title="الصيدلية غير متاحة"
          message="لم نتمكن من العثور على هذه الصيدلية ضمن المتاجر النشطة."
          action={<PrimaryButton label="العودة للرئيسية" onPress={() => router.push("/home")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen title={pharmacy.name} subtitle="تصفح المنتجات المتاحة من هذه الصيدلية." backHref="/home" backLabel="الرئيسية">
      <View style={styles.hero}>
        <CatalogImage uri={coverImage} alt={pharmacy.name} fallbackLabel="صيدلية" containerStyle={styles.coverImageWrap} imageStyle={styles.coverImage} />
        <View style={styles.heroOverlay}>
          <Pressable style={styles.heroIconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </Pressable>
          <View style={styles.heroActions}>
            <Pressable style={styles.heroIconButton} onPress={() => router.push("/profile")}>
              <Ionicons name="heart-outline" size={20} color={theme.colors.text} />
            </Pressable>
            <Pressable style={styles.heroIconButton}>
              <Ionicons name="share-social-outline" size={19} color={theme.colors.text} />
            </Pressable>
          </View>
        </View>
        <View style={styles.logoWrap}>
          {pharmacy.image_url ? (
            <CatalogImage
              uri={pharmacy.image_url}
              alt={pharmacy.name}
              fallbackLabel={pharmacy.name.slice(0, 1)}
              containerStyle={styles.logoImageWrap}
              imageStyle={styles.logoImage}
            />
          ) : (
            <Text style={styles.logoText}>{pharmacy.name.slice(0, 1)}</Text>
          )}
        </View>
      </View>

      <View style={styles.infoHeader}>
        <View style={styles.titleCopy}>
          <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
          <Text style={styles.pharmacyAddress} numberOfLines={2}>
            {pharmacy.address || "صيدلية معتمدة"}
          </Text>
        </View>
        <Pressable style={styles.hoursControl}>
          <Text style={styles.hoursText}>{pharmacy.is_open ? "مفتوحة الآن" : "غير متاحة"}</Text>
          <Ionicons name="chevron-down" size={15} color={theme.colors.primaryDark} />
        </Pressable>
      </View>

      <View style={styles.statsPanel}>
        <View style={styles.statItem}>
          <Ionicons name="star" size={17} color="#9A6500" />
          <Text style={styles.statValue}>{ratingLabel}</Text>
          <Text style={styles.statLabel}>التقييم</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="bicycle-outline" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.statValue}>حسب العنوان</Text>
          <Text style={styles.statLabel}>رسوم التوصيل</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="navigate-outline" size={18} color={theme.colors.info} />
          <Text style={styles.statValue}>قريبة منك</Text>
          <Text style={styles.statLabel}>المسافة</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={18} color={theme.colors.primaryDark} />
          <Text style={styles.statValue}>{etaLabel}</Text>
          <Text style={styles.statLabel}>التوصيل</Text>
        </View>
      </View>

      <SearchInput placeholder="ابحث داخل هذه الصيدلية..." value={query} onChangeText={setQuery} />

      <SectionTitle label="تصفح حسب الفئات" />
      {categoryCards.length === 0 ? (
        <EmptyCard title="لا توجد فئات" message="لا توجد فئات مرتبطة بمنتجات هذه الصيدلية بعد." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroller}>
          {categoryCards.map((category) => (
            <Pressable
              key={category.id}
              style={styles.categoryCard}
              onPress={() =>
                router.push({
                  pathname: "/categories/[categoryId]",
                  params: { categoryId: category.id, pharmacyId: pharmacy.id },
                })
              }
            >
              <CatalogImage
                uri={getPharmacyCategoryImage(pharmacyProducts, data.categories, category.id)}
                alt={category.label}
                fallbackLabel=""
                containerStyle={styles.categoryImageWrap}
                imageStyle={styles.categoryImage}
              />
              <View style={styles.categoryIconBadge}>
                <Ionicons name={category.icon as IconName} size={18} color={theme.colors.primaryDark} />
              </View>
              <Text style={styles.categoryTitle} numberOfLines={2}>
                {category.label}
              </Text>
              <Text style={styles.categoryMeta}>{getPharmacyCategoryProductCount(pharmacyProducts, data.categories, category.id)} منتج</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      <SectionTitle label={query ? "المنتجات المطابقة" : "منتجات الصيدلية"} />
      {visibleProducts.length === 0 ? (
        <EmptyCard title="لا توجد منتجات" message="لم نجد منتجات مطابقة داخل هذه الصيدلية. جرّب البحث بكلمة أخرى." />
      ) : (
        visibleCategorySections.map((category) => {
          const categoryProducts = getProductsForPharmacyParentCategory(visibleProducts, data.categories, category.id).slice(0, 6);

          return (
            <View key={category.id} style={styles.categorySection}>
              <View style={styles.categorySectionHeader}>
                <Text style={styles.categorySectionTitle}>{category.label}</Text>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: "/categories/[categoryId]",
                      params: { categoryId: category.id, pharmacyId: pharmacy.id },
                    })
                  }
                >
                  <Text style={styles.sectionAction}>عرض الكل</Text>
                </Pressable>
              </View>

              <View style={styles.productList}>
                {categoryProducts.map((product) => (
                  <CustomerProductCard key={product.id} product={product} vendors={data.vendors} />
                ))}
              </View>
            </View>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 236,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: theme.colors.accent,
  },
  coverImageWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    top: theme.spacing[12],
    left: theme.spacing[12],
    right: theme.spacing[12],
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroActions: {
    flexDirection: "row-reverse",
    gap: theme.spacing[8],
  },
  heroIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  logoWrap: {
    position: "absolute",
    right: theme.spacing[16],
    bottom: theme.spacing[16],
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
  },
  logoText: {
    color: theme.colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  infoHeader: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  titleCopy: {
    flex: 1,
    gap: 5,
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.xl,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacyAddress: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  hoursControl: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: theme.colors.accent,
  },
  hoursText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
  },
  statsPanel: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[12],
  },
  statItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "center",
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#E7F0EA",
    marginVertical: 4,
  },
  categoryScroller: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    paddingBottom: theme.spacing[4],
  },
  categoryCard: {
    width: 138,
    minHeight: 158,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryImageWrap: {
    height: 78,
    borderRadius: 0,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryIconBadge: {
    position: "absolute",
    top: theme.spacing[12],
    right: theme.spacing[12],
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  categoryTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "right",
    paddingHorizontal: theme.spacing[12],
    paddingTop: theme.spacing[12],
  },
  categoryMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "right",
    paddingHorizontal: theme.spacing[12],
    paddingTop: 4,
    paddingBottom: theme.spacing[12],
  },
  categorySection: {
    gap: theme.spacing[12],
  },
  categorySectionHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  categorySectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  sectionAction: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
  },
  productList: {
    gap: theme.spacing[12],
  },
  logoImageWrap: {
  width: "100%",
  height: "100%",
  borderRadius: 21,
},
logoImage: {
  width: "100%",
  height: "100%",
},
});
