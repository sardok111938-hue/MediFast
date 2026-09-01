import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  Card,
  EmptyCard,
  ErrorCard,
  HelperText,
  LoadingCard,
  Pill,
  PrimaryButton,
  QuantityStepper,
  Screen,
  SectionTitle,
} from "../src/components/CustomerUI";
import { addProductToCart } from "../src/lib/cart-store";
import {
  fetchCustomerProductById,
  getCategoryPathLabel,
  getProductById,
  getVendorById,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/features/orders/customer-orders";
import { CatalogImage } from "../src/components/CatalogImage";

export default function ProductDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ productId?: string | string[] }>();
  const productId = Array.isArray(params.productId)
    ? params.productId[0]
    : params.productId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const cachedProduct = getProductById(data.products, productId);
  const [fallbackProduct, setFallbackProduct] =
    useState<typeof cachedProduct>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const product = cachedProduct ?? fallbackProduct;

  const vendor = useMemo(
    () => getVendorById(data.vendors, product?.vendor_id),
    [data.vendors, product?.vendor_id],
  );
  const categoryLabel = useMemo(
    () => getCategoryPathLabel(data.categories, product?.category_id),
    [data.categories, product?.category_id],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFallbackProduct() {
      if (!productId || cachedProduct || loading) {
        return;
      }

      setFallbackLoading(true);
      setFallbackError(null);

      try {
        const nextProduct = await fetchCustomerProductById(productId);

        if (!cancelled) {
          setFallbackProduct(nextProduct);
        }
      } catch (fetchError) {
        if (!cancelled) {
          setFallbackError(
            fetchError instanceof Error
              ? fetchError.message
              : "تعذر تحميل المنتج.",
          );
        }
      } finally {
        if (!cancelled) {
          setFallbackLoading(false);
        }
      }
    }

    void loadFallbackProduct();

    return () => {
      cancelled = true;
    };
  }, [cachedProduct, loading, productId]);

  if (loading || fallbackLoading) {
    return (
      <Screen
        title="تفاصيل المنتج"
        subtitle="راجع تفاصيل المنتج قبل إضافته إلى السلة."
        backHref="/search"
        backLabel="العودة إلى البحث"
      >
        <LoadingCard message="جارٍ تحميل المنتج..." />
      </Screen>
    );
  }

  if (error || fallbackError) {
    return (
      <Screen
        title="تفاصيل المنتج"
        subtitle="راجع تفاصيل المنتج قبل إضافته إلى السلة."
        backHref="/search"
        backLabel="العودة إلى البحث"
      >
        <ErrorCard
          message={error ?? fallbackError ?? "تعذر تحميل المنتج."}
          onRetry={() => void reload()}
        />
      </Screen>
    );
  }

  if (!product) {
    return (
      <Screen
        title="تفاصيل المنتج"
        subtitle="راجع معلومات المنتج قبل إضافته إلى السلة."
        backHref="/search"
        backLabel="العودة إلى البحث"
      >
        <EmptyCard
          title="المنتج غير متوفر"
          message="هذا المنتج غير متاح الآن. ارجع إلى القائمة لمتابعة التصفح."
          action={
            <PrimaryButton
              label="العودة إلى البحث"
              onPress={() => router.push("/search")}
            />
          }
        />
      </Screen>
    );
  }

  const outOfStock = product.stock_quantity === 0;

  return (
    <Screen
      title={product.name}
      subtitle="راجع معلومات المنتج، اختر الكمية المناسبة، ثم أضفه إلى السلة."
      backHref="/search"
      backLabel="العودة إلى البحث"
    >
      <Card style={styles.heroCard}>
        <CatalogImage
          uri={product.image_url}
          alt={product.name}
          resizeMode="contain"
          containerStyle={styles.productImageWrap}
          imageStyle={styles.productImage}
          fallbackTextStyle={styles.imageFallbackText}
        />
        <View style={styles.heroBody}>
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <View style={styles.heroBadges}>
                {categoryLabel ? (
                  <Pill label={categoryLabel} tone="info" />
                ) : null}
                {product.stock_quantity > 0 ? (
                  <Pill label="متوفر الآن" tone="success" />
                ) : (
                  <Pill label="غير متوفر" tone="warning" />
                )}
              </View>
              <Text style={styles.productName}>{product.name}</Text>
              <Text style={styles.productDescription}>
                {product.description}
              </Text>
              <Text style={styles.vendorLabel}>
                {vendor ? `يباع من ${vendor.name}` : "منتج من متجر معتمد"}
              </Text>
            </View>
          </View>

          <View style={styles.purchasePanel}>
            <Text style={styles.price}>
              {formatCustomerCurrency(product.price)}
            </Text>
            <Text style={styles.stockLabel}>
              {outOfStock
                ? "غير متوفر حاليًا"
                : `الكمية المتوفرة: ${product.stock_quantity}`}
            </Text>
            <HelperText tone="info">
              الأسعار المعروضة للمراجعة، وسيتم تأكيد الطلب النهائي عند الإرسال.
            </HelperText>
          </View>

          <View style={styles.metaGrid}>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>الفئة</Text>
              <Text style={styles.metaValue}>{categoryLabel || "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>المتجر</Text>
              <Text style={styles.metaValue}>{vendor?.name ?? "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>الباركود</Text>
              <Text style={styles.metaValue}>{product.barcode ?? "-"}</Text>
            </View>
            <View style={styles.metaTile}>
              <Text style={styles.metaTitle}>عنوان المتجر</Text>
              <Text style={styles.metaValue}>{vendor?.address ?? "-"}</Text>
            </View>
          </View>

          <SectionTitle label="الكمية" />
          <Card style={styles.checkoutCard}>
            <QuantityStepper
              value={quantity}
              onIncrement={() =>
                setQuantity((current) =>
                  Math.min(product.stock_quantity || current + 1, current + 1),
                )
              }
              onDecrement={() =>
                setQuantity((current) => Math.max(1, current - 1))
              }
              disableIncrement={
                outOfStock || quantity >= product.stock_quantity
              }
              disableDecrement={quantity <= 1}
            />

            <HelperText tone="info">
              اختر الكمية المناسبة الآن ثم أضف المنتج إلى السلة لمتابعة الدفع
              النقدي عند الاستلام.
            </HelperText>

            <View style={styles.buttonGroup}>
              <PrimaryButton
                label={outOfStock ? "غير متوفر حاليًا" : "أضف إلى السلة الآن"}
                disabled={outOfStock}
                onPress={() => {
                  addProductToCart(product, quantity);
                  router.push("/(tabs)/cart");
                }}
              />
              <PrimaryButton
                label="متابعة التصفح"
                variant="secondary"
                onPress={() => router.push("/search")}
              />
            </View>
          </Card>
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    padding: 0,
    overflow: "hidden",
    gap: theme.spacing[16],
  },
  productImageWrap: {
    margin: theme.spacing[12],
    marginBottom: 0,
    borderRadius: 24,
    backgroundColor: "#F7FAF8",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },

  productImage: {
    width: "100%",
    height: 320,
  },
  heroBody: {
    padding: theme.spacing[20],
    gap: theme.spacing[16],
  },
  heroTop: {
    gap: theme.spacing[12],
  },
  heroCopy: {
    gap: theme.spacing[8],
  },
  heroBadges: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  productName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.xl,
    textAlign: "right",
  },
  productDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  vendorLabel: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  purchasePanel: {
    backgroundColor: "#F5FBF7",
    borderWidth: 1,
    borderColor: "#D7E9DC",
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    gap: theme.spacing[4],
  },
  price: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: 30,
    textAlign: "right",
  },
  stockLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  metaGrid: {
    gap: 10,
  },
  metaTile: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: 14,
    gap: 4,
    backgroundColor: theme.colors.background,
  },
  metaTitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  metaValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "700",
    textAlign: "right",
  },
  checkoutCard: {
    backgroundColor: "#FFF7E5",
    borderColor: "#F1E2B5",
    gap: theme.spacing[12],
  },
  buttonGroup: {
    gap: 10,
  },
  imageFallbackText: {
    fontSize: theme.typography.body.md,
  },
});
