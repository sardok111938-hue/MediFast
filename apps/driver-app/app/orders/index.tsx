import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import {
  DriverBadge,
  DriverButton,
  DriverEmptyCard,
  DriverErrorCard,
  DriverHelper,
  DriverListCard,
  DriverLoadingCard,
  DriverRouteBlock,
  DriverScreen,
  DriverSectionTitle,
  DriverStatCard,
  DriverSummaryGrid,
} from "../../src/components/DriverUI";
import { useDriverI18n } from "../../src/lib/i18n";
import {
  claimAvailableOrder,
  formatCurrency,
  formatDate,
  getCurrentDriverProfile,
  getPaymentStatusLabel,
  getStatusLabel,
  listAvailablePickupOrders,
  listCurrentDriverOrders,
  normalizeError,
  statusTone,
  type DriverOrder,
} from "../../src/lib/driver-data";
import { signOutDriver, subscribeToAssignedOrders, subscribeToAvailablePickupOrders, supabase } from "../../src/lib/supabase";
import { theme } from "@medifast/ui";

export default function DriverOrdersListScreen() {
  const router = useRouter();
  const { t } = useDriverI18n();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const profile = await getCurrentDriverProfile();
      setDriverId(profile.driverId);

      const [assignedOrders, pickupOrders] = await Promise.all([
        listCurrentDriverOrders(profile.driverId),
        listAvailablePickupOrders(),
      ]);

      setOrders(assignedOrders);
      setAvailableOrders(pickupOrders);
    } catch (nextError) {
      setError(normalizeError(nextError));
      setOrders([]);
      setAvailableOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const assignedChannel = subscribeToAssignedOrders(driverId, () => {
      void loadOrders("refresh");
    });
    const availableChannel = subscribeToAvailablePickupOrders(() => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(assignedChannel);
      void supabase.removeChannel(availableChannel);
    };
  }, [driverId, loadOrders]);

  async function handleClaimOrder(orderId: string) {
    setClaimingOrderId(orderId);
    setError(null);

    try {
      await claimAvailableOrder(orderId);
      await loadOrders("refresh");
    } catch (nextError) {
      setError(normalizeError(nextError));
    } finally {
      setClaimingOrderId(null);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOutDriver();
    setLoggingOut(false);
    router.replace("/");
  }

  return (
    <DriverScreen
      title="Orders"
      subtitle="Pickup queue first, then your active deliveries."
      action={<DriverButton label={loggingOut ? "Logging out..." : "Logout"} onPress={() => void handleLogout()} disabled={loggingOut} variant="secondary" />}
      scroll={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders("refresh")} />}
        contentContainerStyle={styles.scrollContent}
      >
        <DriverButton label="Back to Dashboard" onPress={() => router.push("/dashboard")} variant="ghost" />

        {loading ? (
          <DriverLoadingCard message="Loading driver orders..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
        ) : (
          <>
            <DriverSummaryGrid>
              <DriverStatCard label="Available pickups" value={String(availableOrders.length)} hint="Ready orders without a driver." />
              <DriverStatCard label="Assigned deliveries" value={String(orders.length)} hint="Deliveries currently linked to you." />
              <DriverStatCard label="Driver availability" value={availableOrders.length > 0 ? "جاهز" : "هادئ"} hint="Pull to refresh for latest queue." />
            </DriverSummaryGrid>

            <DriverSectionTitle>Available pickup orders</DriverSectionTitle>

            {availableOrders.length === 0 ? (
              <DriverEmptyCard title="No pickup orders" message="No ready-for-pickup orders are available right now." />
            ) : (
              availableOrders.map((order) => (
                <DriverListCard
                  key={`available-${order.id}`}
                  title={order.vendorName}
                  subtitle={`${t("Orders")} ${order.id} • ${formatDate(order.createdAt)}`}
                  badge={<DriverBadge label={getStatusLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />}
                >
                  <DriverRouteBlock pickup={order.pickupAddress} dropoff={order.dropoffAddress} />
                  <DriverHelper>
                    {`${t("Customer")}: ${order.customerName} • ${getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)} • ${formatCurrency(order.total)}`}
                  </DriverHelper>

                  <DriverButton
                    label={claimingOrderId === order.id ? "Accepting..." : "Accept Delivery"}
                    onPress={() => void handleClaimOrder(order.id)}
                    disabled={Boolean(claimingOrderId)}
                  />
                </DriverListCard>
              ))
            )}

            <DriverSectionTitle>My assigned deliveries</DriverSectionTitle>

            {orders.length === 0 ? (
              <DriverEmptyCard title="No assigned orders" message="Accepted deliveries will appear here." />
            ) : (
              orders.map((order) => (
                <DriverListCard
                  key={order.id}
                  title={order.vendorName}
                  subtitle={`${t("Orders")} ${order.id} • ${formatDate(order.createdAt)}`}
                  badge={<DriverBadge label={getStatusLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />}
                >
                  <DriverRouteBlock pickup={order.pickupAddress} dropoff={order.dropoffAddress} />
                  <DriverHelper>
                    {`${t("Customer")}: ${order.customerName} • ${getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}`}
                  </DriverHelper>

                  <DriverButton
                    label="View Details"
                    onPress={() =>
                      router.push({
                        pathname: "/orders/[orderId]",
                        params: { orderId: order.id },
                      })
                    }
                  />
                </DriverListCard>
              ))
            )}
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
});
