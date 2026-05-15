import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { theme } from "@medifast/ui";
import { CustomerProductCard } from "../src/components/CustomerProductCard";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import {
  buildPharmacyCategoryTree,
  filterProducts,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useCustomerCatalogData();
  const suggestedCategories = useMemo(() => buildPharmacyCategoryTree(data.categories).parents.slice(0, 4), [data.categories]);
  const results = useMemo(() => filterProducts(data.products, { query }), [data.products, query]);

  return (
    <Screen title="البحث" subtitle="ابحث عن الدواء أو الفيتامين أو المنتج المناسب بالاسم أو الباركود.">
      <SearchInput placeholder="جرّب كتابة باراسيتامول أو امسح الباركود..." value={query} onChangeText={setQuery} />
      {loading ? <LoadingCard message="جارٍ تحميل نتائج البحث..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      <SectionTitle label="فئات مقترحة" />
      <View style={styles.suggestionRow}>
        {suggestedCategories.map((category) => (
          <PrimaryButton
            key={category.id}
            label={category.label}
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/product-listing",
                params: { categoryId: category.id },
              })
            }
          />
        ))}
      </View>

      <SectionTitle label={query ? "نتائج البحث" : "نتائج شائعة"} />
      {results.length === 0 ? (
        <EmptyCard
          title="لم يتم العثور على منتجات"
          message="جرّب كلمة أوسع أو ابحث بالباركود أو افتح قائمة جميع المنتجات."
          action={<PrimaryButton label="تصفح جميع المنتجات" onPress={() => router.push("/product-listing")} />}
        />
      ) : (
        <View style={styles.resultList}>
          {results.map((product) => (
            <CustomerProductCard key={product.id} product={product} vendors={data.vendors} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestionRow: {
    gap: 10,
  },
  resultList: {
    gap: theme.spacing[12],
  },
});
