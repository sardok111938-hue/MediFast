import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { theme } from "@medifast/ui";
import { CustomerProductCard } from "../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import {
  buildPharmacyCategoryTree,
  filterProducts,
  getPharmacyParentCategoryById,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";

export default function ProductListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string | string[]; query?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const query = Array.isArray(params.query) ? params.query[0] : params.query;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const activeCategory = useMemo(() => getPharmacyParentCategoryById(data.categories, categoryId), [categoryId, data.categories]);
  const categories = useMemo(() => buildPharmacyCategoryTree(data.categories).parents, [data.categories]);
  const products = useMemo(() => filterProducts(data.products, { categories: data.categories, categoryId, query }), [data.categories, data.products, categoryId, query]);

  return (
    <Screen
      title={activeCategory ? activeCategory.label : "المنتجات"}
      subtitle={activeCategory ? "تصفح منتجات هذه الفئة مع عرض واضح للسعر والمخزون." : "تصفح منتجات الصيدلية ببطاقات واضحة وسريعة."}
      backHref={categoryId ? "/categories" : "/home"}
      backLabel={categoryId ? "العودة إلى الفئات" : "العودة إلى الرئيسية"}
    >
      <SearchInput placeholder="ابحث داخل المنتجات..." onPress={() => router.push("/search")} />
      {loading ? <LoadingCard message="جارٍ تحميل المنتجات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      <SectionTitle label="تصفح الفئات" />
      <View style={styles.categoryRow}>
        {categories.map((category) => (
          <PrimaryButton
            key={category.id}
            label={category.label}
            variant={category.id === categoryId ? "primary" : "secondary"}
            onPress={() =>
              router.replace({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          />
        ))}
      </View>

      <SectionTitle label={query ? "المنتجات المطابقة" : "المنتجات المتاحة"} />
      {products.length === 0 ? (
        <EmptyCard
          title="لا توجد منتجات"
          message="لم نجد منتجات لهذه الفئة أو لهذا البحث. جرّب فئة أخرى أو افتح البحث."
          action={<PrimaryButton label="فتح البحث" onPress={() => router.push("/search")} />}
        />
      ) : (
        <View style={styles.productList}>
          {products.map((product) => (
            <CustomerProductCard key={product.id} product={product} vendors={data.vendors} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  categoryRow: {
    gap: 10,
  },
  productList: {
    gap: theme.spacing[12],
  },
});
