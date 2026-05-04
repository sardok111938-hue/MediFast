import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, LoadingCard, PrimaryButton, Screen, StatusBadge } from "../src/components/CustomerUI";
import {
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  loadCurrentCustomerOrders,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../src/lib/customer-orders";

export default function OrderTrackingScreen() {
  const router = useRouter();
  const [latestOrder, setLatestOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLatestOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadCurrentCustomerOrders();
      setLatestOrder(result.orders[0] ?? null);
    } catch (nextError) {
      setLatestOrder(null);
      setError(normalizeCustomerOrderError(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestOrder();
  }, [loadLatestOrder]);

  return (
    <Screen title="Order Tracking" subtitle="Jump straight to your newest order and continue following the delivery.">
      {loading ? <LoadingCard message="Loading your order..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void loadLatestOrder()} /> : null}
      {!loading && !error && latestOrder ? (
        <Card style={styles.trackerCard}>
          <Text style={styles.orderVendor}>{latestOrder.vendorName}</Text>
          <HelperText>{formatCustomerDate(latestOrder.createdAt)}</HelperText>
          <View style={styles.badgeStack}>
            <StatusBadge label={formatOrderStatusLabel(latestOrder.orderStatus)} tone={orderStatusTone(latestOrder.orderStatus)} />
            <StatusBadge
              label={formatCustomerPaymentStatusLabel(latestOrder.paymentStatus, latestOrder.paymentMethod)}
              tone={orderStatusTone(latestOrder.paymentStatus)}
            />
          </View>
          <PrimaryButton
            label="Track latest order"
            onPress={() =>
              router.push({
                pathname: "/orders/[orderId]",
                params: { orderId: latestOrder.id },
              })
            }
          />
          <PrimaryButton label="Open Orders" onPress={() => router.push("/order-history")} variant="secondary" />
        </Card>
      ) : null}
      {!loading && !error && !latestOrder ? (
        <EmptyCard
          title="No orders yet"
          message="Your customer orders will appear here after checkout."
          action={<PrimaryButton label="Start shopping" onPress={() => router.push("/product-listing")} />}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trackerCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  orderVendor: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  badgeStack: {
    gap: theme.spacing[8],
  },
});
