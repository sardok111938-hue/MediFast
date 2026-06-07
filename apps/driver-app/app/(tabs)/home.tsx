import { useCallback, useEffect, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  DriverErrorCard,
  DriverLoadingCard,
  DriverOrderCard,
  DriverScreen,
  shortOrderRef,
} from "../../src/components/DriverUI";
import {
  DriverHomeDeliveryAction,
  DriverHomeMetrics,
  DriverHomeSectionHeader,
  DriverReadyStateCard,
  DriverStatusSummaryCard,
} from "../../src/components/home";
import {
  formatDate,
  getStatusLabel,
  listAvailablePickupOrders,
  listCurrentDriverOrders,
  normalizeError,
  statusTone,
  type DriverOrder,
} from "../../src/lib/driver-data";
import { useDriverSession } from "../../src/hooks/use-driver-session";
import { getDriverNotificationsLastViewedAt } from "../../src/lib/notification-read-state";
import { supabase } from "../../src/lib/supabase";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { driver, loading, error, refresh } = useDriverSession();
  const [summary, setSummary] = useState<{
    availablePickups: number;
    activeDeliveries: number;
    latestAssignedAt: string;
    nextDelivery: DriverOrder | null;
  }>({
    availablePickups: 0,
    activeDeliveries: 0,
    latestAssignedAt: "",
    nextDelivery: null,
  });
  const [countsLoading, setCountsLoading] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const loadNotificationCount = useCallback(async (driverId: string) => {
    const lastViewedAt = await getDriverNotificationsLastViewedAt();

    let query = supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_role", "driver")
      .eq("recipient_id", driverId);

    if (lastViewedAt) {
      query = query.gt("created_at", lastViewedAt);
    }

    const { count, error: countError } = await query;

    if (countError) {
      setNotificationCount(0);
      return;
    }

    setNotificationCount(count ?? 0);
  }, []);

  async function loadDashboardCounts(driverId: string) {
    setCountsLoading(true);

    try {
      const [orders, availablePickups] = await Promise.all([
        listCurrentDriverOrders(driverId),
        listAvailablePickupOrders(),
      ]);

      setSummary({
        availablePickups: availablePickups.length,
        activeDeliveries: orders.filter((order) =>
          ["assigned", "picked_up", "on_the_way"].includes(order.orderStatus),
        ).length,
        latestAssignedAt: orders[0]?.createdAt ?? "",
        nextDelivery: orders[0] ?? null,
      });
    } finally {
      setCountsLoading(false);
    }
  }

  useEffect(() => {
    if (driver?.driverId) {
      void loadDashboardCounts(driver.driverId);
    }
  }, [driver?.driverId]);

  useFocusEffect(
    useCallback(() => {
      if (driver?.driverId) {
        void loadNotificationCount(driver.driverId);
      } else {
        setNotificationCount(0);
      }
    }, [driver?.driverId, loadNotificationCount]),
  );

  useEffect(() => {
    if (!driver?.driverId) {
      return;
    }

    const channel = supabase
      .channel(`driver-notifications-${driver.driverId}-${Date.now()}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${driver.driverId}`,
        },
        () => {
          void loadNotificationCount(driver.driverId);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [driver?.driverId, loadNotificationCount]);

  async function handleRefresh() {
    const nextDriver = await refresh();

    if (nextDriver?.driverId) {
      await loadDashboardCounts(nextDriver.driverId);
    }
  }

  const nextDelivery = summary.nextDelivery;
  const freshnessText = summary.latestAssignedAt
    ? `آخر توصيل ${formatDate(summary.latestAssignedAt)}`
    : "محدّث الآن";

  return (
    <DriverScreen>
      {loading ? (
        <DriverLoadingCard message="جارٍ تحميل لوحة السائق..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <View style={styles.headerRow}>
            <Pressable
              style={styles.notificationButton}
              onPress={() => router.push("../notifications")}
            >
              <View style={styles.notificationIconWrap}>
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color={theme.colors.primaryDark}
                />

                {notificationCount > 0 ? (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationBadgeText}>
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          </View>
          <DriverStatusSummaryCard
            driver={driver}
            countsLoading={countsLoading}
            freshnessText={freshnessText}
          />

          <DriverHomeMetrics
            availablePickups={summary.availablePickups}
            activeDeliveries={summary.activeDeliveries}
            isAvailable={driver?.isAvailable}
            loading={countsLoading}
          />

          <DriverHomeSectionHeader
            hasDelivery={Boolean(nextDelivery)}
            onRefresh={() => void handleRefresh()}
          />

          {nextDelivery ? (
            <DriverOrderCard
              vendorName={nextDelivery.vendorName}
              customerName={nextDelivery.customerName}
              orderRef={`طلب ${shortOrderRef(nextDelivery.id)}`}
              statusLabel={getStatusLabel(nextDelivery.orderStatus)}
              statusTone={statusTone(nextDelivery.orderStatus)}
              pickupAddress={nextDelivery.pickupAddress}
              dropoffAddress={nextDelivery.dropoffAddress}
              action={
                <DriverHomeDeliveryAction
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/orders/[orderId]",
                      params: { orderId: nextDelivery.id },
                    })
                  }
                />
              }
              compact
            />
          ) : (
            <DriverReadyStateCard availablePickups={summary.availablePickups} />
          )}
        </>
      )}
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: "flex-start",
  },
  notificationButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF7F2",
    borderWidth: 1,
    borderColor: "#DCE8E1",
    alignItems: "center",
    justifyContent: "center",
  },
  notificationIconWrap: {
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: -8,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
});
