import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet } from "react-native";
import { DriverBadge, DriverButton, DriverEmptyCard, DriverErrorCard, DriverListCard, DriverLoadingCard, DriverRow, DriverScreen } from "../../src/components/DriverUI";
import { useDriverI18n } from "../../src/lib/i18n";
import { formatCurrency, formatDate, getCurrentDriverProfile, getStatusLabel, listCurrentDriverOrders, normalizeError, statusTone, type DriverOrder } from "../../src/lib/driver-data";
import { signOutDriver, subscribeToAssignedOrders, supabase } from "../../src/lib/supabase";
import { theme } from "@medifast/ui";

export default function DriverOrdersListScreen() {
  const router = useRouter();
  const { t } = useDriverI18n();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

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
      setOrders(await listCurrentDriverOrders(profile.driverId));
    } catch (nextError) {
      setError(normalizeError(nextError));
      setOrders([]);
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

    const channel = subscribeToAssignedOrders(driverId, () => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driverId, loadOrders]);

  async function handleLogout() {
    setLoggingOut(true);
    await signOutDriver();
    setLoggingOut(false);
    router.replace("/");
  }

  return (
    <DriverScreen
      title="Orders"
      subtitle="Only the deliveries currently assigned to you appear here."
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
          <DriverLoadingCard message="Loading your assigned orders..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
        ) : orders.length === 0 ? (
          <DriverEmptyCard title="No assigned orders" message="Orders will appear here when dispatch assigns them to your account." />
        ) : (
          orders.map((order) => (
            <DriverListCard
              key={order.id}
              title={`${t("Orders")} ${order.id}`}
              subtitle={order.vendorName}
              badge={<DriverBadge label={getStatusLabel(order.orderStatus)} tone={statusTone(order.orderStatus)} />}
            >
              <DriverRow label="Customer" value={order.customerName} />
              <DriverRow label="Dropoff" value={order.dropoffAddress} />
              <DriverRow label="Total" value={formatCurrency(order.total)} />
              <DriverRow label="Payment" value={getStatusLabel(order.paymentStatus)} valueTone="muted" />
              <DriverRow label="Created" value={formatDate(order.createdAt)} valueTone="muted" />

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
