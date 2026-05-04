import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  Card,
  DetailRow,
  EmptyCard,
  ErrorCard,
  HelperText,
  LoadingCard,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusBadge,
} from "../../src/components/CustomerUI";
import { useCustomerI18n } from "../../src/lib/i18n";
import {
  customerOrderTimeline,
  formatCustomerCurrency,
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  getDeliveryHeadline,
  getTimelineStepState,
  loadCurrentCustomerOrder,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../../src/lib/customer-orders";
import { subscribeToOrderTracking, supabase } from "../../src/lib/supabase";

export default function CustomerOrderDetailScreen() {
  const router = useRouter();
  const { t } = useCustomerI18n();
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
    <Screen title="Order Detail" subtitle="Live order progress, payment details, and delivery updates." scroll={false} backHref="/order-history" backLabel="Back to orders">
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <LoadingCard message="Loading your order..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadOrder()} />
        ) : !order ? (
          <EmptyCard title="Order not found" message="This order is not available for the current customer account." />
        ) : (
          <>
            <Card style={styles.statusCard}>
              <Text style={styles.orderNumber}>{`${t("Orders")} ${order.id}`}</Text>
              <Text style={styles.vendorName}>{order.vendorName}</Text>
              <View style={styles.badgeStack}>
                <StatusBadge label={formatOrderStatusLabel(order.orderStatus)} tone={orderStatusTone(order.orderStatus)} />
                <StatusBadge
                  label={formatCustomerPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}
                  tone={orderStatusTone(order.paymentStatus)}
                />
              </View>
              {deliveryHeadline ? <HelperText tone={deliveryHeadline.tone}>{deliveryHeadline.message}</HelperText> : null}
            </Card>

            <Card>
              <SectionTitle label="Delivery status" />
              <DetailRow label="Driver / Delivery" value={order.driverName ?? "Awaiting driver assignment"} />
              <DetailRow label="Delivery Address" value={order.deliveryAddress} />
              <DetailRow label="Created" value={formatCustomerDate(order.createdAt)} />
            </Card>

            <Card>
              <SectionTitle label="Status Timeline" />
              {order.orderStatus === "rejected" || order.orderStatus === "cancelled" ? (
                <HelperText tone="danger">This order was {formatOrderStatusLabel(order.orderStatus)}.</HelperText>
              ) : (
                customerOrderTimeline.map((step, index) => {
                  const stepState = getTimelineStepState(order.orderStatus, step);
                  return (
                    <View key={step} style={styles.timelineRow}>
                      <View style={styles.timelineRail}>
                        <View
                          style={[
                            styles.timelineDot,
                            stepState === "completed" ? styles.timelineDotCompleted : null,
                            stepState === "current" ? styles.timelineDotCurrent : null,
                          ]}
                        />
                        {index < customerOrderTimeline.length - 1 ? (
                          <View
                            style={[
                              styles.timelineLine,
                              stepState === "completed" ? styles.timelineLineCompleted : null,
                            ]}
                          />
                        ) : null}
                      </View>
                      <View style={styles.timelineCopy}>
                        <Text style={[styles.timelineLabel, stepState === "upcoming" ? styles.timelineLabelUpcoming : null]}>
                          {t(formatOrderStatusLabel(step))}
                        </Text>
                        <Text style={styles.timelineHint}>
                          {stepState === "completed" ? "Completed" : stepState === "current" ? "Current step" : "Up next"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              )}
            </Card>

            <Card>
              <SectionTitle label="Payment & totals" />
              <DetailRow label="Total" value={formatCustomerCurrency(order.total)} />
              <DetailRow label="Payment method" value="Cash on delivery" />
              <DetailRow label="Payment status" value={formatCustomerPaymentStatusLabel(order.paymentStatus, order.paymentMethod)} />
            </Card>

            <Card>
              <SectionTitle label="Items" />
              {order.items.length === 0 ? (
                <HelperText>No order items were found.</HelperText>
              ) : (
                order.items.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={styles.itemTitle}>{item.productName}</Text>
                    <DetailRow label="Quantity" value={String(item.quantity)} />
                    <DetailRow label="Unit price" value={formatCustomerCurrency(item.unitPrice)} />
                    <DetailRow label="Subtotal" value={formatCustomerCurrency(item.totalPrice)} />
                  </View>
                ))
              )}
            </Card>

            <PrimaryButton label="Browse products again" variant="secondary" onPress={() => router.push("/product-listing")} />
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing[16],
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[12],
    paddingBottom: 132,
  },
  scrollView: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  orderNumber: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.caption.md,
    textTransform: "uppercase",
  },
  vendorName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  badgeStack: {
    gap: theme.spacing[8],
  },
  timelineRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
    minHeight: 64,
  },
  timelineRail: {
    alignItems: "center",
    width: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  timelineDotCompleted: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  timelineDotCurrent: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineCopy: {
    flex: 1,
    gap: 4,
    paddingBottom: theme.spacing[8],
  },
  timelineLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
  },
  timelineLabelUpcoming: {
    color: theme.colors.muted,
  },
  timelineHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
  },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing[16],
    gap: theme.spacing[8],
    backgroundColor: theme.colors.background,
  },
  itemTitle: {
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    color: theme.colors.text,
  },
});
