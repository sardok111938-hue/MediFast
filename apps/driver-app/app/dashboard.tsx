import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DriverBadge, DriverButton, DriverCard, DriverErrorCard, DriverHelper, DriverLoadingCard, DriverRouteBlock, DriverScreen, DriverSectionTitle, DriverStatCard, DriverSummaryGrid } from "../src/components/DriverUI";
import { theme } from "@medifast/ui";
import { formatDate, getStatusLabel, listAvailablePickupOrders, listCurrentDriverOrders, normalizeError, statusTone, type DriverOrder } from "../src/lib/driver-data";
import { useDriverI18n } from "../src/lib/i18n";
import { useDriverSession } from "../src/hooks/use-driver-session";
import { signOutDriver } from "../src/lib/supabase";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { t, isRTL } = useDriverI18n();
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
  const [loggingOut, setLoggingOut] = useState(false);

  async function loadDashboardCounts(driverId: string) {
    setCountsLoading(true);

    try {
      const [orders, availablePickups] = await Promise.all([
        listCurrentDriverOrders(driverId),
        listAvailablePickupOrders(),
      ]);

      setSummary({
        availablePickups: availablePickups.length,
        activeDeliveries: orders.filter((order) => order.orderStatus === "assigned" || order.orderStatus === "on_the_way").length,
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

  async function handleRefresh() {
    const nextDriver = await refresh();
    if (nextDriver?.driverId) {
      await loadDashboardCounts(nextDriver.driverId);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOutDriver();
    setLoggingOut(false);
    router.replace("/");
  }

  const nextDelivery = summary.nextDelivery;

  return (
      <DriverScreen
      title={driver?.fullName ? `${t("Hi")} ${driver.fullName.split(" ")[0]}` : "Driver Dashboard"}
      subtitle="Pickup-ready orders and your active deliveries in one calm workspace."
      action={<DriverButton label={loggingOut ? "Logging out..." : "Logout"} onPress={() => void handleLogout()} disabled={loggingOut} variant="secondary" />}
    >
      {loading ? (
        <DriverLoadingCard message="Loading your driver dashboard..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <DriverCard variant="accent">
            <View style={styles.accountHeader}>
              <View style={styles.accountMeta}>
                <Text style={[styles.accountName, isRTL ? styles.textRight : null]}>{driver?.fullName ?? "السائق"}</Text>
                <View style={styles.badgeRow}>
                  <DriverBadge label={driver?.approvalStatus ?? "unknown"} tone={statusTone(driver?.approvalStatus ?? "")} />
                  <DriverBadge label={driver?.isAvailable ? "متاح للاستلام" : "مشغول بتوصيل"} tone={driver?.isAvailable ? "success" : "info"} />
                </View>
              </View>
              <DriverButton label="View Orders" onPress={() => router.push("/orders")} />
            </View>
            <DriverHelper>
              {driver?.isAvailable ? "أنت جاهز لقبول طلبات الاستلام المتاحة." : "سيعود توفر السائق تلقائيًا بعد تسليم الطلب الحالي."}
            </DriverHelper>
          </DriverCard>

          <DriverSummaryGrid>
            <DriverStatCard
              label="Available pickups"
              value={countsLoading ? "..." : String(summary.availablePickups)}
              hint="Ready orders without a driver."
            />
            <DriverStatCard
              label="Assigned deliveries"
              value={countsLoading ? "..." : String(summary.activeDeliveries)}
              hint="Orders currently linked to you."
            />
            <DriverStatCard
              label="Driver availability"
              value={driver?.isAvailable ? "متاح" : "مشغول"}
              hint={summary.latestAssignedAt ? `${t("Latest assignment")} ${formatDate(summary.latestAssignedAt)}` : "Synced from driver profile."}
            />
          </DriverSummaryGrid>

          <DriverCard>
            <DriverSectionTitle>{nextDelivery ? "التوصيلة التالية" : "جاهز للعمل"}</DriverSectionTitle>
            {nextDelivery ? (
              <>
                <View style={styles.orderHeader}>
                  <View style={styles.orderHeaderText}>
                    <Text style={[styles.orderVendor, isRTL ? styles.textRight : null]}>{nextDelivery.vendorName}</Text>
                    <Text style={[styles.orderMeta, isRTL ? styles.textRight : null]}>{`${t("Orders")} ${nextDelivery.id}`}</Text>
                  </View>
                  <DriverBadge label={getStatusLabel(nextDelivery.orderStatus)} tone={statusTone(nextDelivery.orderStatus)} />
                </View>
                <DriverRouteBlock pickup={nextDelivery.pickupAddress} dropoff={nextDelivery.dropoffAddress} />
                <DriverButton label="Open Delivery" onPress={() => router.push({ pathname: "/orders/[orderId]", params: { orderId: nextDelivery.id } })} />
              </>
            ) : (
              <>
                <DriverHelper>افتح قائمة الطلبات لقبول طلب استلام أو متابعة التوصيلات المسندة.</DriverHelper>
                <DriverButton label="View Orders" onPress={() => router.push("/orders")} />
              </>
            )}
          </DriverCard>

          <DriverButton label="Refresh Dashboard" onPress={() => void handleRefresh()} variant="ghost" />
        </>
      )}
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  accountMeta: {
    flex: 1,
    gap: theme.spacing[8],
  },
  accountName: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  orderHeader: {
    flexDirection: "row",
    gap: theme.spacing[12],
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  orderHeaderText: {
    flex: 1,
    gap: theme.spacing[4],
  },
  orderVendor: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
  },
  orderMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
  },
  textRight: {
    textAlign: "right",
  },
});
