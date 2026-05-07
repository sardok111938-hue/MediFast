import { useMemo } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { formatCategoryLabel } from "@medifast/i18n";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, LoadingCard, Pill, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import { addProductToCart } from "../src/lib/cart-store";
import { filterProducts, getCategoryById, getVendorById, useCustomerCatalogData } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";
import { CatalogImage } from "../src/components/CatalogImage";

export default function ProductListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string | string[]; query?: string | string[] }>();
  const categoryId = Array.isArray(params.categoryId) ? params.categoryId[0] : params.categoryId;
  const query = Array.isArray(params.query) ? params.query[0] : params.query;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const activeCategory = getCategoryById(data.categories, categoryId);
  const categories = useMemo(() => data.categories, [data.categories]);
  const products = useMemo(() => filterProducts(data.products, { categoryId, query }), [data.products, categoryId, query]);

  return (
    <Screen
      title={activeCategory ? formatCategoryLabel(activeCategory) : "المنتجات"}
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
            label={formatCategoryLabel(category)}
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
        products.map((product) => (
          <Card key={product.id} style={styles.productCard}>
            <View style={styles.productRow}>
              <CatalogImage
                uri={product.image_url}
                alt={product.name}
                containerStyle={styles.productImageWrap}
                imageStyle={styles.productImage}
              />
              <View style={styles.productBody}>
                <View style={styles.productHeader}>
                  <View style={styles.productCopy}>
                    <View style={styles.productMetaBadges}>
                      {product.stock_quantity > 0 ? <Pill label="متوفر الآن" tone="success" /> : null}
                      {getCategoryById(data.categories, product.category_id) ? (
                        <Pill label={formatCategoryLabel(getCategoryById(data.categories, product.category_id))} tone="info" />
                      ) : null}
                    </View>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productDescription}>{product.description}</Text>
                    <Text style={styles.productVendor}>{getVendorById(data.vendors, product.vendor_id)?.name ?? "متجر معتمد"}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <Text style={styles.productPrice}>{formatCustomerCurrency(product.price)}</Text>
                  <Text style={styles.productStock}>{product.stock_quantity > 0 ? `متوفر: ${product.stock_quantity}` : "غير متوفر حاليًا"}</Text>
                </View>

                <View style={styles.buttonGroup}>
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
                  <PrimaryButton
                    label="أضف إلى السلة"
                    disabled={product.stock_quantity === 0}
                    onPress={() => {
                      addProductToCart(product, 1);
                      router.push("/cart");
                    }}
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
  categoryRow: {
    gap: 10,
  },
  productCard: {
    gap: theme.spacing[12],
    borderColor: "#D7E9DC",
  },
  productRow: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  productImageWrap: {
    width: 112,
    height: 112,
    borderRadius: theme.radius.lg,
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productBody: {
    flex: 1,
    gap: theme.spacing[12],
  },
  productHeader: {
    gap: theme.spacing[8],
  },
  productCopy: {
    gap: theme.spacing[4],
  },
  productMetaBadges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  productName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    textAlign: "right",
  },
  productDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  productVendor: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  metaRow: {
    gap: 4,
  },
  productPrice: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    textAlign: "right",
  },
  productStock: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  buttonGroup: {
    gap: 10,
    marginTop: theme.spacing[4],
  },
});
