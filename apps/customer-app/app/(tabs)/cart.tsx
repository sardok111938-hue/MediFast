import { useRouter } from "expo-router";
import { useMemo } from "react";
import { getVendorById, useCustomerVendors } from "../../src/modules/marketplace/catalog/customer-catalog";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, LoadingCard, PrimaryButton, QuantityStepper, Screen, SectionTitle } from "../../src/ui";
import {
  getCartItemCount,
  getCartSubtotal,
  removeProductFromCart,
  setCartItemQuantity,
  useCustomerCart,
} from "../../src/modules/cart/cart-store";
import { useCartFreshness } from "../../src/modules/cart/cart-freshness";
import { formatCustomerCurrency } from "../../src/modules/orders/customer-orders";
import { CatalogImage } from "../../src/ui/media/CatalogImage";

export default function CartScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const { vendors } = useCustomerVendors();

  const subtotal = getCartSubtotal(cartItems);
  const itemCount = getCartItemCount(cartItems);
  const hasItems = cartItems.length > 0;

  const recommendedVendor = useMemo(
    () => cartItems[0]?.snapshot.vendor_id ?? null,
    [cartItems],
  );
  
  const selectedVendor = useMemo(
    () => getVendorById(vendors, recommendedVendor),
    [vendors, recommendedVendor],
  );
  
  const freshness = useCartFreshness(cartItems);

  const selectedVendorIds = useMemo(
    () => Array.from(new Set(cartItems.map((item) => item.snapshot.vendor_id).filter(Boolean))),
    [cartItems],
  );

  const hasMultipleVendors = selectedVendorIds.length > 1;
  
return (
  <Screen title="" subtitle="">
    {freshness.loading ? <LoadingCard message="جارٍ التحقق من صلاحية السلة..." /> : null}
    {freshness.error ? <ErrorCard message={freshness.error} onRetry={() => void freshness.refresh()} /> : null}

    <SectionTitle label="محتويات السلة" />

    {!hasItems ? (
      <EmptyCard
        title="السلة فارغة"
        message="أضف بعض المنتجات من أحد المتاجر قبل متابعة الدفع."
        action={<PrimaryButton label="تصفح المنتجات" onPress={() => router.push("/search")} />}
      />
    ) : (
      cartItems.map((item) => {

return (
  <Card key={item.id} style={styles.itemCard}>
    <View style={styles.itemRow}>
      <CatalogImage
        uri={item.snapshot.image_url}
        alt={item.snapshot.name}
        containerStyle={styles.itemImage}
        fallbackLabel={item.snapshot.name.slice(0, 1)}
      />

      <View style={styles.itemContent}>
        <View style={styles.itemTopRow}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.snapshot.name}
          </Text>

          <Pressable
            style={styles.removeButton}
            onPress={() => removeProductFromCart(item.product_id)}
          >
            <Text style={styles.removeButtonText}>حذف</Text>
          </Pressable>
        </View>

        {item.snapshot.description ? (
          <Text style={styles.itemDescription} numberOfLines={1}>
            {item.snapshot.description}
          </Text>
        ) : null}

<View style={styles.itemMetaRow}>
  {item.quantity > 1 ? (
    <Text style={styles.itemPrice}>
      السعر: {formatCustomerCurrency(item.snapshot.price)} للقطعة
    </Text>
  ) : (
    <View />
  )}

  <Text style={styles.itemSubtotal}>
    {formatCustomerCurrency(item.quantity * item.snapshot.price)}
  </Text>
</View>
        <View style={styles.stepperRow}>
          <QuantityStepper
            value={item.quantity}
            onIncrement={() => setCartItemQuantity(item.product_id, item.quantity + 1)}
            onDecrement={() => setCartItemQuantity(item.product_id, item.quantity - 1)}
            disableIncrement={item.quantity >= item.snapshot.stock_quantity}
            disableDecrement={item.quantity <= 1}
          />
        </View>
      </View>
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
          ? "السلة تحتوي على منتجات من أكثر من متجر. احذف منتجات متجر واحد قبل متابعة الدفع."
          : recommendedVendor
            ? "يمكنك إضافة منتجات من أكثر من متجر، لكن الدفع يتم لمتجر واحد في كل طلب."
            : "أضف بعض المنتجات للمتابعة."}
      </HelperText>

{!freshness.valid && hasItems ? (
  <HelperText tone="danger">
    عالج مشاكل السلة الظاهرة قبل متابعة الدفع.
  </HelperText>
) : null}

{selectedVendor && !selectedVendor.is_open ? (
  <HelperText tone="danger">
    المتجر مغلق حالياً. يمكنك تصفح المنتجات والطلب عند فتحه.
  </HelperText>
) : null}

<PrimaryButton
  label="متابعة إلى الدفع"
  onPress={() => router.push("/checkout")}
  disabled={
    !hasItems ||
    !freshness.valid ||
    hasMultipleVendors ||
    (selectedVendor ? !selectedVendor.is_open : false)
  }
/>
    </Card>
  </Screen>
);
}

const styles = StyleSheet.create({
itemCard: {
  gap: theme.spacing[8],
  paddingVertical: theme.spacing[12],
  paddingHorizontal: theme.spacing[12],
},

itemRow: {
  flexDirection: "row-reverse",
  alignItems: "center",
  gap: theme.spacing[12],
},

itemImage: {
  width: 52,
  height: 52,
  borderRadius: theme.radius.md,
  backgroundColor: "#DCEBDF",
},

itemContent: {
  flex: 1,
  gap: 5,
},

itemTopRow: {
  flexDirection: "row-reverse",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: theme.spacing[8],
},

itemName: {
  flex: 1,
  color: theme.colors.text,
  fontWeight: "900",
  fontSize: theme.typography.body.md,
  lineHeight: 20,
  textAlign: "right",
},

removeButton: {
  borderRadius: 999,
  backgroundColor: "#F7EAEA",
  paddingHorizontal: 9,
  paddingVertical: 4,
},

removeButtonText: {
  color: "#B42318",
  fontSize: 11,
  fontWeight: "900",
},

itemDescription: {
  color: theme.colors.muted,
  fontSize: theme.typography.caption.md,
  lineHeight: 16,
  textAlign: "right",
},

itemMetaRow: {
  flexDirection: "row-reverse",
  alignItems: "center",
  justifyContent: "space-between",
  gap: theme.spacing[8],
},

itemPrice: {
  color: theme.colors.primaryDark,
  fontWeight: "800",
  fontSize: theme.typography.caption.md,
  textAlign: "right",
},

itemSubtotal: {
  color: theme.colors.text,
  fontWeight: "900",
  fontSize: theme.typography.body.sm,
  textAlign: "left",
},

stepperRow: {
  alignItems: "flex-end",
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
