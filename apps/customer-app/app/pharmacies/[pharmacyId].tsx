import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import type { Product } from "@medifast/types";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  getPharmacyCategoryProductCount,
  getPharmacyParentCategoriesForProducts,
  getVendorById,
  isFavouriteVendor,
  toggleFavouriteVendor,
  useCustomerCatalogData,
  getCategoryTheme,
  buildPharmacyCategoryTree,
} from "../../src/lib/customer-catalog";

function getPharmacyProducts(products: Product[], pharmacyId?: string | null) {
  if (!pharmacyId) {
    return [];
  }

  return products.filter((product) => product.vendor_id === pharmacyId);
}

function getCoverImage(products: Product[]) {
  return products.find((product) => product.image_url)?.image_url ?? null;
}

export default function PharmacyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pharmacyId?: string | string[] }>();
  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);

  useEffect(() => {
    if (!pharmacyId) {
      return;
    }

    void (async () => {
      try {
        setIsFavourite(await isFavouriteVendor(pharmacyId));
      } catch (error) {
        console.error(error);
      }
    })();
  }, [pharmacyId]);

  async function handleToggleFavourite() {
    if (!pharmacyId || favouriteLoading) {
      return;
    }

    try {
      setFavouriteLoading(true);
      const nextValue = await toggleFavouriteVendor(pharmacyId);
      setIsFavourite(nextValue);
    } catch (error) {
      console.error(error);
    } finally {
      setFavouriteLoading(false);
    }
  }

  const pharmacy = useMemo(() => getVendorById(data.vendors, pharmacyId), [data.vendors, pharmacyId]);
  const pharmacyProducts = useMemo(() => getPharmacyProducts(data.products, pharmacyId), [data.products, pharmacyId]);

  const categoryCards = useMemo(
  () => buildPharmacyCategoryTree(data.categories).parents.slice(0, 6),
  [data.categories],
);

  const coverImage = useMemo(
    () => pharmacy?.image_url ?? getCoverImage(pharmacyProducts),
    [pharmacy?.image_url, pharmacyProducts],
  );

  const productCount = pharmacyProducts.length;

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
    <Screen title="" subtitle="">
      <View style={styles.hero}>
        <CatalogImage
          uri={coverImage}
          alt={pharmacy.name}
          fallbackLabel="صيدلية"
          containerStyle={styles.coverImageWrap}
          imageStyle={styles.coverImage}
        />

        <View style={styles.heroOverlay}>
          <Pressable style={styles.heroIconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </Pressable>

          <Pressable style={styles.heroIconButton} onPress={() => void handleToggleFavourite()} disabled={favouriteLoading}>
            <Ionicons
              name={isFavourite ? "heart" : "heart-outline"}
              size={21}
              color={isFavourite ? "#D64545" : theme.colors.text}
            />
          </Pressable>
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

      <View style={styles.headerCard}>
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={styles.pharmacyName}>{pharmacy.name}</Text>
            <Text style={styles.pharmacyAddress} numberOfLines={2}>
              {pharmacy.address || "صيدلية معتمدة"}
            </Text>
          </View>

          <View style={styles.statusPill}>
            <Text style={styles.statusText}>{pharmacy.is_open ? "مفتوحة" : "غير متاحة"}</Text>
          </View>
        </View>

        <View style={styles.quickStats}>
          <View style={styles.quickStat}>
            <Ionicons name="cube-outline" size={17} color={theme.colors.primaryDark} />
            <Text style={styles.quickStatValue}>{productCount}</Text>
            <Text style={styles.quickStatLabel}>منتج</Text>
          </View>

          <View style={styles.quickStatDivider} />

          <View style={styles.quickStat}>
            <Ionicons name="grid-outline" size={17} color={theme.colors.primaryDark} />
            <Text style={styles.quickStatValue}>{categoryCards.length}</Text>
            <Text style={styles.quickStatLabel}>فئات</Text>
          </View>

          <View style={styles.quickStatDivider} />

          <View style={styles.quickStat}>
            <Ionicons name="time-outline" size={17} color={theme.colors.primaryDark} />
            <Text style={styles.quickStatValue}>30-45</Text>
            <Text style={styles.quickStatLabel}>دقيقة</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <SectionTitle label="الفئات المتاحة" />
        <Text style={styles.sectionHint}>اختر فئة لعرض المنتجات من كل الصيدليات</Text>
      </View>

      {categoryCards.length === 0 ? (
        <EmptyCard title="لا توجد فئات" message="لا توجد فئات مرتبطة بمنتجات هذه الصيدلية بعد." />
      ) : (
        <View style={styles.categoryGrid}>
  {categoryCards.map((category) => {
    const productCount = getPharmacyCategoryProductCount(
      pharmacyProducts,
      data.categories,
      category.id,
    );

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
  params: {
    categoryId: category.id,
    pharmacyId: pharmacy.id,
  },
})
        }
      >

        <Text
          style={[styles.categoryTitle, { color: categoryTheme.text }]}
          numberOfLines={2}
        >
          {category.label}
        </Text>

        <Text
          style={[
            styles.categoryDescription,
            { color: categoryTheme.accent },
          ]}
          numberOfLines={1}
        >
          {category.subcategories.length} أقسام · {productCount} منتجات
        </Text>
      </Pressable>
    );
  })}
</View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 210,
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
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  logoWrap: {
    position: "absolute",
    right: theme.spacing[16],
    bottom: theme.spacing[16],
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
  },
  logoText: {
    color: theme.colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
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
  headerCard: {
    marginTop: -4,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[16],
    gap: theme.spacing[14],
  },
  titleRow: {
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
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 8,
    backgroundColor: theme.colors.accent,
  },
  statusText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
  },
  quickStats: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    borderRadius: 20,
    backgroundColor: "#F7FAF8",
    padding: theme.spacing[10],
  },
  quickStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  quickStatValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "center",
  },
  quickStatLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: "#E3EEE7",
    marginVertical: 4,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
    marginTop: -8,
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
});