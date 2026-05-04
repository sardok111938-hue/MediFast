import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { DriverBadge, DriverButton, DriverCard, DriverErrorCard, DriverHelper, DriverListCard, DriverLoadingCard, DriverScreen, DriverSectionTitle, DriverStatCard } from "../src/components/DriverUI";
import { theme } from "@medifast/ui";
import { formatDate, listCurrentDriverOrders, normalizeError, statusTone } from "../src/lib/driver-data";
import { useDriverI18n } from "../src/lib/i18n";
import { useDriverSession } from "../src/hooks/use-driver-session";
import { signOutDriver } from "../src/lib/supabase";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { t, isRTL } = useDriverI18n();
  const { driver, loading, error, refresh } = useDriverSession();
  const [counts, setCounts] = useState({ todayAssigned: 0, active: 0, completed: 0, latestAssignedAt: "" });
  const [countsLoading, setCountsLoading] = useState(false);
  const [availabilityEnabled, setAvailabilityEnabled] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (driver) {
      setAvailabilityEnabled(driver.isAvailable);
    }
  }, [driver]);

  async function loadDashboardCounts(driverId: string) {
    setCountsLoading(true);

    try {
      const orders = await listCurrentDriverOrders(driverId);
      const todayKey = new Date().toDateString();
      setCounts({
        todayAssigned: orders.filter((order) => new Date(order.createdAt).toDateString() === todayKey).length,
        active: orders.filter((order) => order.orderStatus === "assigned" || order.orderStatus === "accepted" || order.orderStatus === "on_the_way").length,
        completed: orders.filter((order) => order.orderStatus === "delivered").length,
        latestAssignedAt: orders[0]?.createdAt ?? "",
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

  return (
      <DriverScreen
      title={driver?.fullName ? `${t("Hi")} ${driver.fullName.split(" ")[0]}` : "Driver Dashboard"}
      subtitle="Stay on top of today's assigned deliveries, active drop-offs, and completion progress."
      action={<DriverButton label={loggingOut ? "Logging out..." : "Logout"} onPress={() => void handleLogout()} disabled={loggingOut} variant="secondary" />}
    >
      {loading ? (
        <DriverLoadingCard message="Loading your driver dashboard..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <DriverCard>
            <View style={styles.accountHeader}>
              <View style={styles.accountMeta}>
                <Text style={[styles.accountName, isRTL ? styles.textRight : null]}>{driver?.fullName ?? "Driver"}</Text>
                <DriverBadge label={driver?.approvalStatus ?? "unknown"} tone={statusTone(driver?.approvalStatus ?? "")} />
              </View>
              <DriverButton
                label={availabilityEnabled ? "Online" : "Offline"}
                onPress={() => setAvailabilityEnabled((current) => !current)}
                variant={availabilityEnabled ? "primary" : "secondary"}
              />
            </View>
            <DriverHelper>Availability toggle is UI-only for now.</DriverHelper>
          </DriverCard>

          <View style={styles.statsGrid}>
            <DriverStatCard
              label="Today's Assigned"
              value={countsLoading ? "..." : String(counts.todayAssigned)}
              hint="Orders assigned with today's created date."
            />
            <DriverStatCard
              label="Active Deliveries"
              value={countsLoading ? "..." : String(counts.active)}
              hint="Assigned, accepted, or out-for-delivery orders."
            />
            <DriverStatCard
              label="Completed"
              value={countsLoading ? "..." : String(counts.completed)}
              hint={counts.latestAssignedAt ? `${t("Latest assignment")} ${formatDate(counts.latestAssignedAt)}` : "Delivered orders linked to you."}
            />
          </View>

          <DriverCard>
            <DriverSectionTitle>Ready to work</DriverSectionTitle>
            <DriverHelper>Open your delivery queue to review order details, launch maps, and update statuses.</DriverHelper>
            <DriverButton label="View Orders" onPress={() => router.push("/orders")} />
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
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },
  textRight: {
    textAlign: "right",
  },
});
