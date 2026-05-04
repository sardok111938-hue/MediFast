import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { formatPaymentStatusLabel } from "@medifast/types";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, DetailRow, HelperText, Pill, PrimaryButton, Screen, SectionTitle, StatusBadge } from "../src/components/CustomerUI";
import { getCartItemCount, useCustomerCart } from "../src/lib/cart-store";
import { buildCheckoutPreview, placeCashOnDeliveryOrder } from "../src/lib/cod-checkout";
import { getPrimaryAddress } from "../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../src/lib/customer-orders";
import { clearCustomerCart } from "../src/lib/cart-store";

export default function CheckoutScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const address = getPrimaryAddress();
  const cartCount = getCartItemCount(cartItems);

  const { preview, validationError } = useMemo(() => {
    try {
      return {
        preview: buildCheckoutPreview(cartItems),
        validationError: null,
      };
    } catch (nextError) {
      return {
        preview: null,
        validationError: nextError instanceof Error ? nextError.message : "تعذر تجهيز الطلب.",
      };
    }
  }, [cartItems]);

  async function handlePlaceCashOrder() {
    if (!preview) {
      return;
    }

    setSubmitting(true);
    setSubmissionError(null);

    try {
      const result = await placeCashOnDeliveryOrder(cartItems);
      clearCustomerCart();
      router.replace({
        pathname: "/orders/[orderId]",
        params: { orderId: result.orderId },
      });
    } catch (nextError) {
      setSubmissionError(nextError instanceof Error ? nextError.message : "تعذر إتمام طلب الدفع عند الاستلام.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen title="Checkout" subtitle="Confirm your delivery details and place a cash on delivery order." backHref="/cart" backLabel="Back to cart">
      <Card style={styles.heroCard}>
        <Pill label="Cash on delivery" tone="warning" />
        <Text style={styles.heroTitle}>Cash to be paid on delivery</Text>
        <Text style={styles.heroText}>Your order is reserved now. Payment will be collected when the driver hands over the delivery.</Text>
      </Card>

      <Card>
        <SectionTitle
          label="Delivery address"
          actionLabel="Change"
          onAction={() =>
            router.push({
              pathname: "/address-selection",
              params: { from: "checkout" },
            })
          }
        />
        <Text style={styles.addressTitle}>{address?.label ?? "Select address"}</Text>
        <Text style={styles.addressLine}>
          {address ? `${address.line_1}${address.line_2 ? `, ${address.line_2}` : ""}, ${address.area}, ${address.city}` : "Choose a delivery address before placing the order."}
        </Text>
      </Card>

      <Card>
        <SectionTitle label="Items in this order" />
        {cartItems.map((item) => (
          <View key={item.id} style={styles.itemRow}>
            <View style={styles.itemCopy}>
              <Text style={styles.itemName}>{item.product.name}</Text>
              <Text style={styles.itemMeta}>
                {item.quantity} x {formatCustomerCurrency(item.product.price)}
              </Text>
            </View>
            <Text style={styles.itemTotal}>{formatCustomerCurrency(item.product.price * item.quantity)}</Text>
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle label="Order summary" />
        <DetailRow label="Items" value={String(cartCount)} />
        <DetailRow label="Subtotal" value={formatCustomerCurrency(preview?.subtotal ?? 0)} />
        <DetailRow label="Delivery fee" value={formatCustomerCurrency(preview?.deliveryFee ?? 0)} />
        <DetailRow label="Total" value={formatCustomerCurrency(preview?.total ?? 0)} />
        <DetailRow label="Payment method" value="Cash on delivery" />
        <DetailRow label="Payment status" value={<StatusBadge label={formatPaymentStatusLabel("pending", "cash_on_delivery")} tone="warning" />} />
        <HelperText tone="info">Your pharmacy will prepare the order first, then a driver will collect the cash at the doorstep.</HelperText>
        {validationError ? <HelperText tone="danger">{validationError}</HelperText> : null}
        {submissionError ? <HelperText tone="danger">{submissionError}</HelperText> : null}
      </Card>

      <PrimaryButton
        label={submitting ? "جارٍ إنشاء الطلب..." : "Place Order"}
        onPress={() => void handlePlaceCashOrder()}
        disabled={!preview || submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#FFF7E5",
    borderColor: "#F1E2B5",
  },
  heroTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
  addressTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
  },
  addressLine: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    paddingVertical: theme.spacing[8],
  },
  itemCopy: {
    flex: 1,
    gap: 4,
  },
  itemName: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body.md,
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
  },
  itemTotal: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
  },
});
