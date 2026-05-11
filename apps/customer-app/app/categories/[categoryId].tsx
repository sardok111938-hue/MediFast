import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import type { Product } from "@medifast/types";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, Pill, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import { addProductToCart } from "../../src/lib/cart-store";
import {
  getPharmacyCategoryImage,
  getPharmacyParentCategoryById,
  getPharmacySubcategoryById,
  getProductsForPharmacyParentCategory,
  getVendorById,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../../src/lib/customer-orders";

function getScopedProducts(products: Product[], pharmacyId?: string | null) {
  if (!pharmacyId) {
    return products;
  }

  return products.filter((product) => product.vendor_id === pharmacyId);
}

export default function MarketplaceCategoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string | string[]; pharmacyId?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [activeSubcategoryId, setActiveSubcategoryId] = useState<string | null>(null);

  const parentCategory = useMemo(() => getPharmacyParentCategoryById(data.categories, categoryId), [categoryId, data.categories]);
  const scopedProducts = useMemo(() => getScopedProducts(data.products, pharmacyId), [data.products, pharmacyId]);
  const pharmacy = useMemo(() => getVendorById(data.vendors, pharmacyId), [data.vendors, pharmacyId]);
  const products = useMemo(
    () => getProductsForPharmacyParentCategory(scopedProducts, data.categories, parentCategory?.id, activeSubcategoryId),
    [activeSubcategoryId, data.categories, parentCategory?.id, scopedProducts],
  );
  const allProducts = useMemo(
    () => getProductsForPharmacyParentCategory(scopedProducts, data.categories, parentCategory?.id),
    [data.categories, parentCategory?.id, scopedProducts],
  );
  const heroImage = useMemo(
    () => (parentCategory ? getPharmacyCategoryImage(scopedProducts, data.categories, parentCategory.id) : null),
    [data.categories, parentCategory, scopedProducts],
  );

  if (loading) {
    return (
      <Screen title="الفئة" subtitle="جارٍ تحميل المنتجات." backHref="/home" backLabel="العودة">
        <LoadingCard message="جارٍ تحميل الفئة..." />
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen title="الفئة" subtitle="تعذر تحميل المنتجات." backHref="/home" backLabel="العودة">
        <ErrorCard message={error} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!parentCategory) {
    return (
      <Screen title="الفئة" subtitle="هذه الفئة غير متاحة." backHref="/home" backLabel="العودة">
        <EmptyCard title="الفئة غير متاحة" message="لم نتمكن من العثور على هذه الفئة." action={<PrimaryButton label="العودة للرئيسية" onPress={() => router.push("/home")} />} />
      </Screen>
    );
  }

  const selectedSubcategory = getPharmacySubcategoryById(parentCategory, activeSubcategoryId);
  const groupedProductIds = new Set(
    parentCategory.subcategories.flatMap((subcategory) =>
      getProductsForPharmacyParentCategory(scopedProducts, data.categories, parentCategory.id, subcategory.id).map((product) => product.id),
    ),
  );
  const ungroupedProducts = !selectedSubcategory ? products.filter((product) => !groupedProductIds.has(product.id)) : [];

  return (
    <Screen
      title={parentCategory.label}
      subtitle={pharmacy ? `منتجات ${parentCategory.label} من ${pharmacy.name}` : "تصفح المنتجات حسب الفئة الرئيسية والفرعية."}
      backHref="/home"
      backLabel="الرئيسية"
    >
      <View style={styles.heroCard}>
        <View style={styles.heroCopy}>
          <View style={styles.heroIcon}>
            <Ionicons name={parentCategory.icon as never} size={24} color={theme.colors.primaryDark} />
          </View>
          <Text style={styles.heroTitle}>{parentCategory.label}</Text>
          <Text style={styles.heroText}>{allProducts.length} منتجات متاحة</Text>
        </View>
        <CatalogImage uri={heroImage} alt={parentCategory.label} fallbackLabel="فئة" containerStyle={styles.heroImageWrap} imageStyle={styles.heroImage} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroller}>
        <Pressable style={[styles.filterChip, !activeSubcategoryId ? styles.filterChipActive : null]} onPress={() => setActiveSubcategoryId(null)}>
          <Text style={[styles.filterText, !activeSubcategoryId ? styles.filterTextActive : null]}>الكل</Text>
        </Pressable>
        {parentCategory.subcategories.map((subcategory) => {
          const active = activeSubcategoryId === subcategory.id;

          return (
            <Pressable key={subcategory.id} style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={() => setActiveSubcategoryId(subcategory.id)}>
              <Text style={[styles.filterText, active ? styles.filterTextActive : null]}>{subcategory.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <SectionTitle label={selectedSubcategory ? selectedSubcategory.label : "الكل"} />
      {products.length === 0 ? (
        <EmptyCard title="لا توجد منتجات" message="لا توجد منتجات متاحة لهذا الاختيار حاليًا." />
      ) : selectedSubcategory ? (
        <View style={styles.productList}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} vendorName={getVendorById(data.vendors, product.vendor_id)?.name} onAdd={() => addProductToCart(product, 1)} />
          ))}
        </View>
      ) : (
        <View style={styles.groupList}>
          {parentCategory.subcategories.map((subcategory) => {
            const subcategoryProducts = getProductsForPharmacyParentCategory(scopedProducts, data.categories, parentCategory.id, subcategory.id);

            if (subcategoryProducts.length === 0) {
              return null;
            }

            return (
              <View key={subcategory.id} style={styles.productGroup}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupTitle}>{subcategory.label}</Text>
                  <Text style={styles.groupCount}>{subcategoryProducts.length} منتجات</Text>
                </View>
                <View style={styles.productList}>
                  {subcategoryProducts.map((product) => (
                    <ProductCard key={product.id} product={product} vendorName={getVendorById(data.vendors, product.vendor_id)?.name} onAdd={() => addProductToCart(product, 1)} />
                  ))}
                </View>
              </View>
            );
          })}
          {parentCategory.subcategories.length === 0 ? (
            <View style={styles.productList}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} vendorName={getVendorById(data.vendors, product.vendor_id)?.name} onAdd={() => addProductToCart(product, 1)} />
              ))}
            </View>
          ) : null}
          {ungroupedProducts.length > 0 ? (
            <View style={styles.productGroup}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupTitle}>منتجات أخرى</Text>
                <Text style={styles.groupCount}>{ungroupedProducts.length} منتجات</Text>
              </View>
              <View style={styles.productList}>
                {ungroupedProducts.map((product) => (
                  <ProductCard key={product.id} product={product} vendorName={getVendorById(data.vendors, product.vendor_id)?.name} onAdd={() => addProductToCart(product, 1)} />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

function ProductCard({ product, vendorName, onAdd }: { product: Product; vendorName?: string; onAdd: () => void }) {
  const router = useRouter();

  return (
    <Pressable
      style={styles.productCard}
      onPress={() =>
        router.push({
          pathname: "/product-detail",
          params: { productId: product.id },
        })
      }
    >
      <CatalogImage uri={product.image_url} alt={product.name} containerStyle={styles.productImageWrap} imageStyle={styles.productImage} />
      <View style={styles.productBody}>
        <View style={styles.badgeRow}>
          <Pill label={product.stock_quantity > 0 ? "متوفر الآن" : "غير متوفر"} tone={product.stock_quantity > 0 ? "success" : "warning"} />
        </View>
        <Text style={styles.productName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.productVendor} numberOfLines={1}>
          {vendorName ?? "صيدلية معتمدة"}
        </Text>
        <View style={styles.productFooter}>
          <View>
            <Text style={styles.productPrice}>{formatCustomerCurrency(product.price)}</Text>
            <Text style={styles.productStock}>{product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : "غير متوفر حاليًا"}</Text>
          </View>
          <Pressable
            style={[styles.addButton, product.stock_quantity === 0 ? styles.addButtonDisabled : null]}
            disabled={product.stock_quantity === 0}
            onPress={(event) => {
              event.stopPropagation();
              onAdd();
              router.push("/cart");
            }}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 150,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[16],
    borderRadius: 28,
    padding: theme.spacing[16],
    backgroundColor: "#E5F6EC",
    borderWidth: 1,
    borderColor: "#CDEBD8",
    overflow: "hidden",
  },
  heroCopy: {
    flex: 1,
    gap: theme.spacing[8],
  },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  heroImageWrap: {
    width: 104,
    height: 104,
    borderRadius: 24,
  },
  heroImage: {
    width: "100%",
    height: "100%",
  },
  filterScroller: {
    flexDirection: "row-reverse",
    gap: theme.spacing[8],
    paddingBottom: theme.spacing[4],
  },
  filterChip: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
  },
  filterTextActive: {
    color: "#FFFFFF",
  },
  groupList: {
    gap: theme.spacing[20],
  },
  productGroup: {
    gap: theme.spacing[12],
  },
  groupHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  groupCount: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  productList: {
    gap: theme.spacing[12],
  },
  productCard: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    padding: theme.spacing[12],
    borderRadius: 22,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  productImageWrap: {
    width: 96,
    height: 112,
    borderRadius: 18,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productBody: {
    flex: 1,
    gap: 6,
  },
  badgeRow: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
  },
  productName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    lineHeight: 23,
    textAlign: "right",
  },
  productVendor: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  productFooter: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  productPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  productStock: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    textAlign: "right",
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.primary,
  },
  addButtonDisabled: {
    opacity: 0.45,
  },
});
