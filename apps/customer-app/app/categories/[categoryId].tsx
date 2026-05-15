import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Product } from "@medifast/types";
import { theme } from "@medifast/ui";
import { CustomerProductCard } from "../../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  getCategoryById,
  getPharmacyParentCategoryById,
  getPharmacySubcategoryById,
  getProductsForPharmacyParentCategory,
  getVendorById,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";

function getScopedProducts(products: Product[], pharmacyId?: string | null) {
  if (!pharmacyId) {
    return products;
  }

  return products.filter((product) => product.vendor_id === pharmacyId);
}

export default function MarketplaceCategoryScreen() {
  const params = useLocalSearchParams<{ categoryId?: string | string[]; pharmacyId?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

  const parentCategory = useMemo(
    () => getPharmacyParentCategoryById(data.categories, categoryId),
    [categoryId, data.categories],
  );
  const requestedCategory = useMemo(() => getCategoryById(data.categories, categoryId), [categoryId, data.categories]);
  const scopedProducts = useMemo(() => getScopedProducts(data.products, pharmacyId), [data.products, pharmacyId]);
  const pharmacy = useMemo(() => getVendorById(data.vendors, pharmacyId), [data.vendors, pharmacyId]);
  const products = useMemo(
    () => getProductsForPharmacyParentCategory(scopedProducts, data.categories, parentCategory?.id, activeSubcategoryId),
    [activeSubcategoryId, data.categories, parentCategory?.id, scopedProducts],
  );

  useEffect(() => {
    setActiveSubcategoryId(requestedCategory?.parent_id ? requestedCategory.id : null);
  }, [requestedCategory?.id, requestedCategory?.parent_id]);

  if (loading) {
    return (
      <Screen title="الفئة" subtitle="جارٍ تحميل المنتجات.">
        <LoadingCard message="جارٍ تحميل الفئة..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="الفئة" subtitle="تعذر تحميل المنتجات.">
        <ErrorCard message={error} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!parentCategory) {
    return (
      <Screen title="الفئة" subtitle="هذه الفئة غير متاحة.">
        <EmptyCard title="الفئة غير متاحة" message="لم نتمكن من العثور على هذه الفئة." />
      </Screen>
    );
  }

  const selectedSubcategory = getPharmacySubcategoryById(parentCategory, activeSubcategoryId);

  return (
    <Screen
      title={parentCategory.label}
      subtitle={pharmacy ? `منتجات ${parentCategory.label} من ${pharmacy.name}` : "تصفح المنتجات حسب الفئة الرئيسية والفرعية."}
    >
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

      {products.length === 0 ? (
        <EmptyCard title="لا توجد منتجات" message="لا توجد منتجات متاحة لهذا الاختيار حاليًا." />
      ) : (
        <View style={styles.productList}>
          {products.map((product) => (
            <CustomerProductCard key={product.id} product={product} vendors={data.vendors} width="48%" />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
