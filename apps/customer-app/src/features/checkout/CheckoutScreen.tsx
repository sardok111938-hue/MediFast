import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, DetailRow, ErrorCard, HelperText, LoadingCard, Pill, PrimaryButton, Screen, SectionTitle, StatusBadge } from "../../components/CustomerUI";
import { getCartItemCount, useCustomerCart } from "../../lib/cart-store";
import { useCartFreshness } from "../../lib/cart-freshness";
import { buildCheckoutPreview, placeCashOnDeliveryOrder } from "./cod-checkout";
import {
  formatSavedAddressLine,
  getPrimaryAddress,
  getVendorById,
  hasSavedAddressCoordinates,
  useCustomerCatalogData,
} from "../../lib/customer-catalog";
import { formatCustomerCurrency, formatCustomerPaymentStatusLabel } from "../orders/customer-orders";
import { clearCustomerCart } from "../../lib/cart-store";

export default function CheckoutScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const address = getPrimaryAddress(data.addresses, data.defaultAddressId);
  const cartCount = getCartItemCount(cartItems);
  const freshness = useCartFreshness(cartItems);

  const selectedVendor = useMemo(
  () => getVendorById(
    data.vendors,
    cartItems[0]?.snapshot.vendor_id ?? null,
  ),
  [data.vendors, cartItems],
);

  const { preview, validationError } = useMemo(() => {
    try {
      return {
        preview: buildCheckoutPreview(cartItems, {
  address,
  vendor: selectedVendor,
}),
        validationError: null,
      };
    } catch (nextError) {
      return {
        preview: null,
        validationError: nextError instanceof Error ? nextError.message : "تعذر تجهيز الطلب.",
      };
    }
  }, [cartItems, address, selectedVendor]);

  async function handlePlaceCashOrder() {
    if (!preview) {
      return;
    }

    if (!freshness.valid) {
      setSubmissionError("لا يمكن إرسال الطلب قبل معالجة مشاكل صلاحية السلة.");
      return;
    }

    if (!address) {
      setSubmissionError("يرجى اختيار عنوان توصيل افتراضي قبل إرسال الطلب.");
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
    <Screen title="الدفع" subtitle="أكد بيانات التوصيل ثم أرسل طلب الدفع النقدي عند الاستلام." backHref="/cart" backLabel="العودة إلى السلة">
      {loading ? <LoadingCard message="جارٍ تحميل العنوان والبيانات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}
      {freshness.loading ? <LoadingCard message="جارٍ التحقق من صلاحية السلة..." /> : null}
      {freshness.error ? <ErrorCard message={freshness.error} onRetry={() => void freshness.refresh()} /> : null}

      <Card style={styles.heroCard}>
        <Pill label="الدفع عند الاستلام" tone="warning" />
        <Text style={styles.heroTitle}>الدفع نقدًا عند التوصيل</Text>
        <Text style={styles.heroText}>تم حجز طلبك الآن، وسيتم تحصيل المبلغ عند تسليم الطلب من قبل السائق.</Text>
      </Card>

      <Card>
        <SectionTitle
          label="عنوان التوصيل"
          actionLabel="تغيير"
          onAction={() =>
            router.push({
              pathname: "/address-selection",
              params: { from: "checkout" },
            })
          }
        />
        <Text style={styles.addressTitle}>عنوان التوصيل</Text>
        <Text style={styles.addressLine}>
          {address ? formatSavedAddressLine(address) : "اختر عنوان التوصيل قبل إرسال الطلب."}
        </Text>
        {address && hasSavedAddressCoordinates(address) ? <HelperText tone="info">تم تحديد الموقع</HelperText> : null}
        {!address ? (
          <>
            <HelperText tone="danger">لا يمكن إكمال الدفع عند الاستلام بدون عنوان توصيل افتراضي.</HelperText>
            <PrimaryButton
              label="اختيار عنوان التوصيل"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: "/address-selection",
                  params: { from: "checkout" },
                })
              }
            />
          </>
        ) : null}
      </Card>

      <Card>
        <SectionTitle label="منتجات الطلب" />
        {cartItems.map((item) => (
          <View key={item.id} style={styles.itemStack}>
            <View style={styles.itemRow}>
              <View style={styles.itemCopy}>
                <Text style={styles.itemName}>{item.snapshot.name}</Text>
                <Text style={styles.itemMeta}>
                  {formatCustomerCurrency(item.snapshot.price)} × {item.quantity}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatCustomerCurrency(item.snapshot.price * item.quantity)}</Text>
            </View>

            {freshness.issuesByProductId[item.product_id]?.map((issue, index) => (
              <Card key={`${item.product_id}-${issue.kind}-${index}`} style={styles.warningCard}>
                <HelperText tone={issue.kind === "price_changed" ? "info" : "danger"}>{issue.message}</HelperText>
                <View style={styles.warningActions}>
                  {issue.kind === "quantity_exceeds_stock" ? (
                    <PrimaryButton
                      label={`تقليل الكمية إلى ${issue.availableStock}`}
                      variant="secondary"
                      onPress={() => freshness.reduceToAvailableStock(item.product_id, issue.availableStock)}
                    />
                  ) : null}
                  {issue.kind !== "price_changed" ? (
                    <PrimaryButton label="إزالة المنتج" variant="ghost" onPress={() => freshness.removeItem(item.product_id)} />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        ))}
      </Card>

      <Card>
        <SectionTitle label="ملخص الطلب" />
        <DetailRow label="عدد القطع" value={String(cartCount)} />
        <DetailRow label="الإجمالي الفرعي" value={formatCustomerCurrency(preview?.subtotal ?? 0)} />
        <DetailRow
  label="المسافة التقديرية"
  value={
    preview?.deliveryDistanceKm != null
      ? `${preview.deliveryDistanceKm.toFixed(1)} كم`
      : "—"
  }
/>

<DetailRow
  label="رسوم التوصيل"
  value={formatCustomerCurrency(preview?.deliveryFee ?? 0)}
/>
        <DetailRow label="الإجمالي" value={formatCustomerCurrency(preview?.total ?? 0)} />
        <DetailRow label="طريقة الدفع" value="الدفع عند الاستلام" />
        <DetailRow label="حالة الدفع" value={<StatusBadge label={formatCustomerPaymentStatusLabel("pending", "cash_on_delivery")} tone="warning" />} />
        
        <HelperText tone="info">
  يتم احتساب رسوم التوصيل النهائية تلقائياً حسب المسافة بين عنوانك والصيدلية.
</HelperText>
        {!freshness.valid ? <HelperText tone="danger">عالج مشاكل صلاحية السلة قبل إرسال الطلب.</HelperText> : null}
        {validationError ? <HelperText tone="danger">{validationError}</HelperText> : null}
        {submissionError ? <HelperText tone="danger">{submissionError}</HelperText> : null}
      </Card>

{selectedVendor && !selectedVendor.is_open ? (
  <HelperText tone="danger">
    الصيدلية مغلقة حالياً ولا يمكن إرسال الطلب الآن.
  </HelperText>
) : null}

      <PrimaryButton
        label={submitting ? "جارٍ إنشاء الطلب..." : "إرسال الطلب"}
        onPress={() => void handlePlaceCashOrder()}
        disabled={
  !preview ||
  !address ||
  submitting ||
  !freshness.valid ||
  (selectedVendor ? !selectedVendor.is_open : false)
}
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
    textAlign: "right",
  },
  heroText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  addressTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    textAlign: "right",
  },
  addressLine: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  itemStack: {
    gap: theme.spacing[8],
  },
  itemRow: {
    flexDirection: "row-reverse",
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
    textAlign: "right",
  },
  itemMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  itemTotal: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
    textAlign: "left",
  },
  warningCard: {
    backgroundColor: "#FFF7E5",
    borderColor: "#F1E2B5",
  },
  warningActions: {
    gap: 10,
  },
});
