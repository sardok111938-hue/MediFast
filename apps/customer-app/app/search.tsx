import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { formatCategoryLabel } from "@medifast/i18n";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, LoadingCard, Pill, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import { filterProducts, getCategoryById, getVendorById, useCustomerCatalogData } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";
import { CatalogImage } from "../src/components/CatalogImage";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { data, loading, error, reload } = useCustomerCatalogData();
  const suggestedCategories = useMemo(() => data.categories.slice(0, 4), [data.categories]);
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
            label={formatCategoryLabel(category)}
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
        results.map((product) => (
          <Card key={product.id} style={styles.resultCard}>
            <View style={styles.resultRow}>
              <CatalogImage
                uri={product.image_url}
                alt={product.name}
                containerStyle={styles.resultImageWrap}
                imageStyle={styles.resultImage}
              />
              <View style={styles.resultCopy}>
                <View style={styles.resultHeader}>
                  <View style={styles.resultBadges}>
                    {getCategoryById(data.categories, product.category_id) ? (
                      <Pill label={formatCategoryLabel(getCategoryById(data.categories, product.category_id))} tone="info" />
                    ) : null}
                    {product.stock_quantity > 0 ? <Pill label="متوفر الآن" tone="success" /> : null}
                  </View>
                  <Text style={styles.resultName}>{product.name}</Text>
                  <Text style={styles.resultDescription}>{product.description}</Text>
                </View>
                <Text style={styles.resultPrice}>{formatCustomerCurrency(product.price)}</Text>
                <Text style={styles.resultMeta}>{getVendorById(data.vendors, product.vendor_id)?.name ?? "متجر معتمد"}</Text>
                <Text style={styles.resultMeta}>{product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : "غير متوفر حاليًا"}</Text>
                <View style={styles.resultActions}>
                  <PrimaryButton
                    label="عرض التفاصيل"
                    variant="secondary"
                    onPress={() =>
                      router.push({
                        pathname: "/product-detail",
                        params: { productId: product.id },
                      })
                    }
                  />
                </View>
              </View>
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  suggestionRow: {
    gap: 10,
  },
  resultCard: {
    gap: theme.spacing[12],
  },
  resultRow: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  resultImageWrap: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
  },
  resultImage: {
    width: "100%",
    height: "100%",
  },
  resultCopy: {
    flex: 1,
    gap: 6,
  },
  resultHeader: {
    gap: 6,
  },
  resultBadges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  resultName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    textAlign: "right",
  },
  resultDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  resultPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    textAlign: "right",
  },
  resultMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  resultActions: {
    marginTop: theme.spacing[8],
    gap: 8,
  },
});
