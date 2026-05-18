import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, LoadingCard, PrimaryButton, QuantityStepper, Screen, SectionTitle } from "../../src/components/CustomerUI";
import {
  getCartItemCount,
  getCartSubtotal,
  removeProductFromCart,
  setCartItemQuantity,
  useCustomerCart,
} from "../../src/lib/cart-store";
import { useCartFreshness } from "../../src/lib/cart-freshness";
import { formatCustomerCurrency } from "../../src/lib/customer-orders";
import { CatalogImage } from "../../src/components/CatalogImage";

export default function CartScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const subtotal = getCartSubtotal(cartItems);
  const itemCount = getCartItemCount(cartItems);
  const hasItems = cartItems.length > 0;
  const recommendedVendor = useMemo(() => cartItems[0]?.snapshot.vendor_id ?? null, [cartItems]);
  const freshness = useCartFreshness(cartItems);

  const selectedVendorIds = useMemo(
  () => Array.from(new Set(cartItems.map((item) => item.snapshot.vendor_id).filter(Boolean))),
  [cartItems]
);

const hasMultipleVendors = selectedVendorIds.length > 1;

return (
  <Screen title="السلة" subtitle="راجع منتجاتك وعدّل الكميات ثم تابع إلى الدفع عندما تكون جاهزًا.">
    {freshness.loading ? <LoadingCard message="جارٍ التحقق من صلاحية السلة..." /> : null}
    {freshness.error ? <ErrorCard message={freshness.error} onRetry={() => void freshness.refresh()} /> : null}

    <SectionTitle label="محتويات السلة" />

    {!hasItems ? (
      <EmptyCard
        title="السلة فارغة"
        message="أضف بعض المنتجات من الصيدلية قبل متابعة الدفع."
        action={<PrimaryButton label="تصفح المنتجات" onPress={() => router.push("/search")} />}
      />
    ) : (
      cartItems.map((item) => {
  console.log("CART IMAGE", {
    name: item.snapshot.name,
    image: item.snapshot.image_url,
  });

  return (
    <Card key={item.id} style={styles.itemCard}>
          <View style={styles.itemRow}>
  <CatalogImage
    uri={item.snapshot.image_url}
    alt={item.snapshot.name}
    containerStyle={styles.itemImage}
    fallbackLabel="صورة المنتج"
  />

  <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.snapshot.name}</Text>
              <Text style={styles.itemDescription}>{item.snapshot.description}</Text>
              <Text style={styles.itemPrice}>{formatCustomerCurrency(item.snapshot.price)}</Text>
            </View>
          </View>

          <View style={styles.itemFooter}>
            <QuantityStepper
              value={item.quantity}
              onIncrement={() => setCartItemQuantity(item.product_id, item.quantity + 1)}
              onDecrement={() => setCartItemQuantity(item.product_id, item.quantity - 1)}
              disableIncrement={item.quantity >= item.snapshot.stock_quantity}
              disableDecrement={item.quantity <= 1}
            />

            <Text style={styles.itemSubtotal}>
              {formatCustomerCurrency(item.quantity * item.snapshot.price)}
            </Text>
          </View>

          {freshness.issuesByProductId[item.product_id]?.map((issue, index) => (
            <Card key={`${item.product_id}-${issue.kind}-${index}`} style={styles.warningCard}>
              <HelperText tone={issue.kind === "price_changed" ? "info" : "danger"}>
                {issue.message}
              </HelperText>

              <View style={styles.warningActions}>
                {issue.kind === "quantity_exceeds_stock" ? (
                  <PrimaryButton
                    label={`تقليل الكمية إلى ${issue.availableStock}`}
                    variant="secondary"
                    onPress={() => freshness.reduceToAvailableStock(item.product_id, issue.availableStock)}
                  />
                ) : null}

                {issue.kind !== "price_changed" ? (
                  <PrimaryButton
                    label="إزالة المنتج"
                    variant="ghost"
                    onPress={() => freshness.removeItem(item.product_id)}
                  />
                ) : null}
              </View>
            </Card>
          ))}

          <PrimaryButton
            label="إزالة المنتج"
            variant="ghost"
            onPress={() => removeProductFromCart(item.product_id)}
          />
        </Card>
  );
})
    )}


    <Card style={styles.summaryCard}>
      <SectionTitle label="ملخص الطلب" />

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>عدد القطع</Text>
        <Text style={styles.summaryValue}>{itemCount}</Text>
      </View>

      <View style={styles.summaryBlock}>
        <Text style={styles.summaryLabel}>الإجمالي الفرعي</Text>
        <Text style={styles.summaryValue}>{formatCustomerCurrency(subtotal)}</Text>
      </View>

      <HelperText tone={hasMultipleVendors ? "danger" : "info"}>
        {hasMultipleVendors
          ? "السلة تحتوي على منتجات من أكثر من صيدلية. احذف منتجات صيدلية واحدة قبل متابعة الدفع."
          : recommendedVendor
            ? "يمكنك إضافة منتجات من أكثر من صيدلية، لكن الدفع يتم لصيدلية واحدة في كل طلب."
            : "أضف بعض المنتجات للمتابعة."}
      </HelperText>

      {!freshness.valid && hasItems ? (
        <HelperText tone="danger">عالج مشاكل السلة الظاهرة قبل متابعة الدفع.</HelperText>
      ) : null}

      <PrimaryButton
        label="متابعة إلى الدفع"
        onPress={() => router.push("/checkout")}
        disabled={!hasItems || !freshness.valid || hasMultipleVendors}
      />
    </Card>
  </Screen>
);
}

const styles = StyleSheet.create({
  itemCard: {
    gap: theme.spacing[16],
  },
  itemRow: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
    backgroundColor: "#DCEBDF",
  },
  itemCopy: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.md,
    textAlign: "right",
  },
  itemDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
    textAlign: "right",
  },
  itemPrice: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
    textAlign: "right",
  },
  itemFooter: {
    gap: 10,
  },
  itemSubtotal: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body.md,
    textAlign: "right",
  },
  warningCard: {
    backgroundColor: "#FFF7E5",
    borderColor: "#F1E2B5",
  },
  warningActions: {
    gap: 10,
  },
  summaryCard: {
    gap: theme.spacing[16],
  },
  summaryBlock: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    textAlign: "left",
  },
});
