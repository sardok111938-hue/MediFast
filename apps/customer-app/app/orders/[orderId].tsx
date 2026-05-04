import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, DetailRow, EmptyCard, ErrorCard, HelperText, LoadingCard, PrimaryButton, Screen, SectionTitle, StatusBadge } from "../../src/components/CustomerUI";
import { useCustomerI18n } from "../../src/lib/i18n";
import { theme } from "@medifast/ui";
import {
  customerOrderTimeline,
  formatCustomerCurrency,
  formatCustomerDate,
  getDeliveryHeadline,
  formatOrderStatusLabel,
  getTimelineStepState,
  loadCurrentCustomerOrder,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../../src/lib/customer-orders";
import { subscribeToOrderTracking, supabase } from "../../src/lib/supabase";

export default function CustomerOrderDetailScreen() {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError("معرّف الطلب غير موجود.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loadCurrentCustomerOrder(orderId);
      setCustomerId(result.customerId);
      setOrder(result.order);
    } catch (nextError) {
      setOrder(null);
      setError(normalizeCustomerOrderError(nextError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!customerId || !orderId) {
      return;
    }

    const channel = subscribeToOrderTracking(orderId, () => {
      void loadOrder();
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [customerId, loadOrder, orderId]);

  const deliveryHeadline = order ? getDeliveryHeadline(order) : null;

  return (
    <Screen title="Order Detail" subtitle="Live order progress, delivery information, and item breakdown." scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <PrimaryButton label="Back to Orders" onPress={() => router.push("/order-history")} variant="ghost" />

        {loading ? (
          <LoadingCard message="Loading your order..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadOrder()} />
        ) : !order ? (
          <EmptyCard title="Order not found" message="This order is not available for the current customer account." />
        ) : (
          <>
            <Card>
              <SectionTitle label="Driver / Delivery" />
              {deliveryHeadline ? <HelperText tone={deliveryHeadline.tone}>{deliveryHeadline.message}</HelperText> : null}
              {order.driverName ? <DetailRow label="Driver / Delivery" value={order.driverName} /> : null}
            </Card>

            <Card>
              <View style={styles.orderHeader}>
                <Text style={[styles.orderTitle, isRTL ? styles.textRight : null]}>{`${t("Orders")} ${order.id}`}</Text>
                <StatusBadge label={formatOrderStatusLabel(order.orderStatus)} tone={orderStatusTone(order.orderStatus)} />
              </View>
              <DetailRow label="Vendor / Store" value={order.vendorName} />
              <DetailRow label="Delivery Address" value={order.deliveryAddress} />
              <DetailRow label="Total" value={formatCustomerCurrency(order.total)} />
              <DetailRow label="Payment Status" value={formatOrderStatusLabel(order.paymentStatus)} />
              <DetailRow label="Created" value={formatCustomerDate(order.createdAt)} />
              <DetailRow label="Driver / Delivery" value={order.driverName ?? "Awaiting driver assignment"} />
            </Card>

            <Card>
              <SectionTitle label="Status Timeline" />
              {order.orderStatus === "rejected" || order.orderStatus === "cancelled" ? (
                <HelperText tone="danger">This order was {formatOrderStatusLabel(order.orderStatus)}.</HelperText>
              ) : (
                customerOrderTimeline.map((step) => {
                  const stepState = getTimelineStepState(order.orderStatus, step);
                  return (
                    <View key={step} style={styles.timelineRow}>
                      <View style={[styles.timelineDot, stepState === "completed" ? styles.timelineCompleted : stepState === "current" ? styles.timelineCurrent : styles.timelineUpcoming]} />
                      <Text style={[styles.timelineLabel, stepState === "upcoming" ? styles.timelineLabelUpcoming : null, stepState === "current" ? styles.timelineLabelCurrent : null, isRTL ? styles.textRight : null]}>
                        {t(formatOrderStatusLabel(step))}
                      </Text>
                    </View>
                  );
                })
              )}
            </Card>

            <Card>
              <SectionTitle label="Items" />
              {order.items.length === 0 ? (
                <HelperText>No order items were found.</HelperText>
              ) : (
                order.items.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={[styles.itemTitle, isRTL ? styles.textRight : null]}>{item.productName}</Text>
                    <DetailRow label="Quantity" value={String(item.quantity)} />
                    <DetailRow label="Price" value={formatCustomerCurrency(item.unitPrice)} />
                    <DetailRow label="Subtotal" value={formatCustomerCurrency(item.totalPrice)} />
                  </View>
                ))
              )}
            </Card>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing[16],
    paddingBottom: theme.spacing[24],
  },
  orderHeader: {
    gap: theme.spacing[8],
  },
  orderTitle: {
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
    color: theme.colors.text,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[12],
    paddingVertical: theme.spacing[8],
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  timelineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineCurrent: {
    backgroundColor: theme.colors.primary,
  },
  timelineUpcoming: {
    backgroundColor: theme.colors.border,
  },
  timelineLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "600",
  },
  timelineLabelUpcoming: {
    color: theme.colors.muted,
  },
  timelineLabelCurrent: {
    fontWeight: "800",
  },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing[16],
    gap: theme.spacing[8],
    backgroundColor: theme.colors.surface,
  },
  itemTitle: {
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    color: theme.colors.text,
  },
  textRight: {
    textAlign: "right",
  },
});
