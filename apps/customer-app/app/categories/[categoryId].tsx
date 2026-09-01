import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { Product, Vendor } from "@medifast/types";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  getCategoryById,
  getPharmacyParentCategoryById,
  getPharmacySubcategoryById,
  useCustomerCatalogData,
  loadCategoryProducts,
  buildPharmacyCategoryTree,
  groupProductsByMarketplaceListing,
} from "../../src/lib/customer-catalog";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

type CategoryProductCardModel = {
  id: string;
  name: string;
  image_url: string;
  lowestPrice: number;
  pharmaciesCount: number;
};

type CategoryVendorFilter = "all" | Vendor["vendor_type"];

const vendorTypeFilters: Array<{
  value: CategoryVendorFilter;
  label: string;
}> = [
  { value: "all", label: "الكل" },
  { value: "pharmacy", label: "صيدليات" },
  { value: "grocery", label: "بقالات" },
  { value: "restaurant", label: "مطاعم" },
  { value: "shop", label: "متاجر" },
  { value: "home_business", label: "مشاريع منزلية" },
  { value: "water_supplier", label: "مياه" },
];

function GroupedCategoryProductCard({
  product,
  onPress,
}: {
  product: CategoryProductCardModel;
  onPress: () => void;
}) {
    return (
    <Pressable
      style={({ pressed }) => [
        styles.groupedProductCard,
        pressed ? styles.groupedProductCardPressed : null,
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
          متوفر في {product.pharmaciesCount} متاجر
        </Text>
      </View>
    </Pressable>
  );
}

export default function MarketplaceCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
  categoryId?: string | string[];
  pharmacyId?: string | string[];
}>();

const pharmacyId = Array.isArray(params.pharmacyId)
  ? params.pharmacyId[0]
  : params.pharmacyId;

  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [vendorTypeFilter, setVendorTypeFilter] = useState<CategoryVendorFilter>("all");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  const parentCategory = useMemo(
    () => getPharmacyParentCategoryById(data.categories, categoryId),
    [categoryId, data.categories],
  );

  const requestedCategory = useMemo(
    () => getCategoryById(data.categories, categoryId),
    [categoryId, data.categories],
  );

  const filteredRawProducts = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);

    return normalizedQuery
    ? products.filter((product) => {
      return (
          normalizeSearch(product.name).includes(normalizedQuery) ||
          normalizeSearch(product.description).includes(normalizedQuery) ||
          normalizeSearch(product.barcode ?? "").includes(normalizedQuery)
        );
      })
    : products;
}, [products, query]);

const marketplaceFilteredRawProducts = useMemo(() => {
  if (pharmacyId || vendorTypeFilter === "all") {
    return filteredRawProducts;
  }

  const matchingVendorIds = new Set(
    data.vendors
      .filter((vendor) => vendor.vendor_type === vendorTypeFilter)
      .map((vendor) => vendor.id),
  );

  return filteredRawProducts.filter((product) =>
    matchingVendorIds.has(product.vendor_id),
  );
}, [
  data.vendors,
  filteredRawProducts,
  pharmacyId,
  vendorTypeFilter,
]);

const filteredGroupedProducts = useMemo(
  () => groupProductsByMarketplaceListing(marketplaceFilteredRawProducts, data.vendors),
  [data.vendors, marketplaceFilteredRawProducts],
);

  useEffect(() => {
    setActiveSubcategoryId(requestedCategory?.parent_id ? requestedCategory.id : null);
  }, [requestedCategory?.id, requestedCategory?.parent_id]);

    useEffect(() => {
  if (!parentCategory) {
    setProducts([]);
    return;
  }

  const tree = buildPharmacyCategoryTree(data.categories);

  const categoryIds = Array.from(
    tree.categoryAndDescendantIdsById.get(
      activeSubcategoryId ?? parentCategory.id,
    ) ?? new Set<string>(),
  );

  let cancelled = false;

  async function loadProducts() {
    try {
      setProductsLoading(true);
      setProductsError(null);

      const nextProducts = await loadCategoryProducts(
        categoryIds,
        pharmacyId,
      );

      if (!cancelled) {
        setProducts(nextProducts);
      }
    } catch (error) {
      if (!cancelled) {
        setProductsError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل المنتجات.",
        );
      }
    } finally {
      if (!cancelled) {
        setProductsLoading(false);
      }
    }
  }

  void loadProducts();

  return () => {
    cancelled = true;
  };
}, [
  activeSubcategoryId,
  data.categories,
  parentCategory,
  pharmacyId,
]);

  if (loading || productsLoading) {
    return (
      <Screen title="" subtitle="" backHref="/home" backLabel="">
        <LoadingCard message="جارٍ تحميل الفئة..." />
      </Screen>
    );
  }

  if (error || productsError) {
    return (
      <Screen title="" subtitle="" backHref="/home" backLabel="">
        <ErrorCard message={error ?? productsError ?? ""} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!parentCategory) {
    return (
      <Screen title="" subtitle="" backHref="/home" backLabel="">
        <EmptyCard title="الفئة غير متاحة" message="لم نتمكن من العثور على هذه الفئة." />
      </Screen>
    );
  }

  const selectedSubcategory = getPharmacySubcategoryById(parentCategory, activeSubcategoryId);

  return (
    <Screen title="" subtitle="" backHref="/home" backLabel="">
      <View style={styles.searchBox}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="ابحث داخل المنتجات"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
          textAlign="right"
        />
      </View>

      {!pharmacyId ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row-reverse",
            gap: theme.spacing[8],
            paddingBottom: theme.spacing[12],
          }}
        >
          {vendorTypeFilters.map((filter) => {
            const active = vendorTypeFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                style={[
                  {
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.spacing[12],
                    paddingVertical: theme.spacing[8],
                  },
                  active
                    ? {
                        borderColor: theme.colors.primary,
                        backgroundColor: theme.colors.accent,
                      }
                    : null,
                ]}
                onPress={() => setVendorTypeFilter(filter.value)}
              >
                <Text
                  style={[
                    {
                      color: theme.colors.muted,
                      fontSize: theme.typography.caption.md,
                      fontWeight: "800",
                    },
                    active
                      ? {
                          color: theme.colors.primaryDark,
                          fontWeight: "900",
                        }
                      : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      <View style={styles.subcategoryGrid}>
        <Pressable
          style={[styles.subcategoryCard, !activeSubcategoryId ? styles.subcategoryCardActive : null]}
          onPress={() => setActiveSubcategoryId(null)}
        >
          <Text style={[styles.subcategoryTitle, !activeSubcategoryId ? styles.subcategoryTitleActive : null]} numberOfLines={2}>
            الكل
          </Text>
        </Pressable>

        {parentCategory.subcategories.map((subcategory) => {
          const active = activeSubcategoryId === subcategory.id;

          return (
            <Pressable
              key={subcategory.id}
              style={[styles.subcategoryCard, active ? styles.subcategoryCardActive : null]}
              onPress={() => setActiveSubcategoryId(subcategory.id)}
            >
              <Text style={[styles.subcategoryTitle, active ? styles.subcategoryTitleActive : null]} numberOfLines={2}>
                {subcategory.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selectedSubcategory ? <SectionTitle label={selectedSubcategory.label} /> : null}

      {(pharmacyId ? filteredRawProducts : filteredGroupedProducts).length === 0 ? (
        <EmptyCard title="لا توجد منتجات" message="لا توجد منتجات متاحة لهذا الاختيار حاليًا." />
      ) : (
        <View style={styles.productList}>
          {pharmacyId
            ? filteredRawProducts.map((product) => (
                <GroupedCategoryProductCard
                  key={product.id}
                  product={{
                    id: product.id,
                    name: product.name,
                    image_url: product.image_url,
                    lowestPrice: product.price,
                    pharmaciesCount: 1,
                  }}
                  onPress={() =>
                    router.push({
                      pathname: "/product-detail",
                      params: { productId: product.id },
                    })
                  }
                />
              ))
            : filteredGroupedProducts.map((product) => (
                <GroupedCategoryProductCard
                  key={product.id}
                  product={product}
                  onPress={() =>
                    router.push({
                      pathname: "/grouped-product/[groupId]",
                      params: {
                        groupId: product.id,
                        ...(vendorTypeFilter === "all"
                          ? {}
                          : { vendorType: vendorTypeFilter }),
                      },
                    })
                  }
                />
              ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[12],
    justifyContent: "center",
    marginBottom: theme.spacing[12],
  },
  searchInput: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    paddingVertical: theme.spacing[12],
  },
  subcategoryGrid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    marginBottom: theme.spacing[4],
  },
  subcategoryCard: {
    width: "31%",
    minHeight: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  subcategoryCardActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  subcategoryTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    lineHeight: 18,
    textAlign: "center",
  },
  subcategoryTitleActive: {
    color: "#FFFFFF",
  },
  productList: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  groupedProductCard: {
    width: "48%",
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
  groupedProductCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  groupedProductImageWrap: {
    width: "100%",
    height: 112,
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
});
