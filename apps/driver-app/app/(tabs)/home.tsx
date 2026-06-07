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
    activeOrders: DriverOrder[];
  }>({
    availablePickups: 0,
    activeDeliveries: 0,
    latestAssignedAt: "",
    nextDelivery: null,
    activeOrders: [],
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

      const activeOrders = orders.filter((order) =>
        ["assigned", "picked_up", "on_the_way"].includes(order.orderStatus),
      );

      const sortedActiveOrders = [...activeOrders].sort(
        (a, b) =>
          (a.estimatedDistanceKm ?? Number.POSITIVE_INFINITY) -
          (b.estimatedDistanceKm ?? Number.POSITIVE_INFINITY),
      );

      setSummary({
        availablePickups: availablePickups.length,
        activeDeliveries: activeOrders.length,
        latestAssignedAt: sortedActiveOrders[0]?.createdAt ?? "",
        nextDelivery: sortedActiveOrders[0] ?? null,
        activeOrders: sortedActiveOrders,
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
            isBusy={summary.activeDeliveries > 0}
          />

          <DriverHomeMetrics
            availablePickups={summary.availablePickups}
            activeDeliveries={summary.activeDeliveries}
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
  batchCard: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: "#E4EEE8",
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    gap: theme.spacing[12],
  },
  batchTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  batchIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  batchTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  batchTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  batchSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  batchRouteBox: {
    backgroundColor: "#F8FAF9",
    borderRadius: theme.radius.md,
    padding: theme.spacing[12],
    gap: 4,
  },
  batchRouteText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  batchAddressText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  batchActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: theme.spacing[4],
  },
  batchActionText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
  },
});
