import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { DriverBadge, DriverButton, DriverCard, DriverEmptyCard, DriverErrorCard, DriverHelper, DriverListCard, DriverLoadingCard, DriverRouteBlock, DriverRow, DriverScreen, DriverSectionTitle } from "../../src/components/DriverUI";
import { useDriverI18n } from "../../src/lib/i18n";
import { theme } from "@medifast/ui";
import {
  formatCurrency,
  formatDate,
  getCurrentDriverProfile,
  getDriverNextActions,
  getDriverOrderDetail,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeError,
  statusTone,
  updateDriverOrderStatus,
  type DriverOrder,
} from "../../src/lib/driver-data";

function buildGoogleMapsUrl(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function DriverOrderDetailScreen() {
  const router = useRouter();
  const { t, isRTL } = useDriverI18n();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [driverId, setDriverId] = useState<string | null>(null);
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError("Order ID is missing.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getCurrentDriverProfile();
      setDriverId(profile.driverId);
      setOrder(await getDriverOrderDetail(profile.driverId, orderId));
    } catch (nextError) {
      setOrder(null);
      setError(normalizeError(nextError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function openMap(address: string) {
    await Linking.openURL(buildGoogleMapsUrl(address));
  }

  async function handleStatusUpdate(nextStatus: string) {
    if (!order || !driverId) {
      return;
    }

    const previousStatus = order.orderStatus;
    setUpdatingStatus(nextStatus);
    setFeedback(null);
    setOrder((current) => (current ? { ...current, orderStatus: nextStatus } : current));

    try {
      await updateDriverOrderStatus({
        driverId,
        orderId: order.id,
        nextStatus,
        currentStatus: previousStatus,
      });

      setFeedback({
        type: "success",
        message: `${t("Order updated to")} ${t(getStatusLabel(nextStatus))}.`,
      });
      await loadOrder();
    } catch (nextError) {
      setOrder((current) => (current ? { ...current, orderStatus: previousStatus } : current));
      setFeedback({
        type: "error",
        message: normalizeError(nextError),
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  const actions = order ? getDriverNextActions(order.orderStatus) : [];

  return (
    <DriverScreen title="Order Detail" subtitle="Review route, products, and the next delivery action." scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <DriverButton label="Back to Orders" onPress={() => router.push("/orders")} variant="ghost" />

        {feedback ? <DriverHelper tone={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</DriverHelper> : null}

        {loading ? (
          <DriverLoadingCard message="Loading order details..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadOrder()} />
        ) : !order ? (
          <DriverEmptyCard title="Order not found" message="This order is not assigned to you or is no longer available." />
        ) : (
          <>
            <DriverListCard
              title={order.vendorName}
              subtitle={`${t("Orders")} ${order.id} • ${formatDate(order.createdAt)}`}
              badge={<DriverBadge label={getStatusLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />}
            >
              <DriverRouteBlock pickup={order.pickupAddress} dropoff={order.dropoffAddress} />
              <DriverRow label="Customer" value={order.customerName} />
              <DriverRow label="Payment Status" value={getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)} valueTone="muted" />
              <DriverRow label="Total" value={formatCurrency(order.total)} />
            </DriverListCard>

            <DriverCard>
              <DriverSectionTitle>Maps</DriverSectionTitle>
              <DriverButton label="Open Pickup in Maps" onPress={() => void openMap(order.pickupAddress)} variant="secondary" />
              <DriverButton label="Open Dropoff in Maps" onPress={() => void openMap(order.dropoffAddress)} />
            </DriverCard>

            <DriverCard>
              <DriverSectionTitle>Items</DriverSectionTitle>
              {order.items.length === 0 ? (
                <DriverHelper>No products are linked to this order.</DriverHelper>
              ) : (
                order.items.map((item) => (
                  <View key={item.id} style={styles.itemCard}>
                    <Text style={[styles.itemTitle, isRTL ? styles.textRight : null]}>{item.productName}</Text>
                    <DriverRow label="Quantity" value={String(item.quantity)} />
                    <DriverRow label="Unit Price" value={formatCurrency(item.unitPrice)} />
                    <DriverRow label="Line Total" value={formatCurrency(item.totalPrice)} />
                  </View>
                ))
              )}
            </DriverCard>

            <DriverCard>
              <DriverSectionTitle>Status Actions</DriverSectionTitle>
              {actions.length === 0 ? (
                <DriverHelper>No driver status actions are available for this order.</DriverHelper>
              ) : (
                actions.map((action) => (
                  <DriverButton
                    key={action.nextStatus}
                    label={updatingStatus === action.nextStatus ? "Updating..." : action.label}
                    onPress={() => void handleStatusUpdate(action.nextStatus)}
                    disabled={Boolean(updatingStatus)}
                  />
                ))
              )}
            </DriverCard>
          </>
        )}
      </ScrollView>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing[16],
    paddingBottom: theme.spacing[24],
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
