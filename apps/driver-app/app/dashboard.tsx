import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  DriverBadge,
  DriverButton,
  DriverCard,
  DriverErrorCard,
  DriverHelper,
  DriverLoadingCard,
  DriverMetricTile,
  DriverOrderCard,
  DriverScreen,
  DriverSectionTitle,
  DriverSummaryGrid,
  shortOrderRef,
} from "../src/components/DriverUI";
import { theme } from "@medifast/ui";
import { formatDate, getStatusLabel, listAvailablePickupOrders, listCurrentDriverOrders, normalizeError, statusTone, type DriverOrder } from "../src/lib/driver-data";
import { useDriverI18n } from "../src/lib/i18n";
import { useDriverSession } from "../src/hooks/use-driver-session";
import { signOutDriver } from "../src/lib/supabase";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
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
  const firstName = driver?.fullName?.split(" ")[0];

  return (
    <DriverScreen
      title={firstName ? `مرحبًا ${firstName}` : "لوحة السائق"}
      subtitle="طلبات الاستلام والتوصيلات النشطة في مكان واحد."
      action={<DriverButton label={loggingOut ? "جارٍ الخروج..." : "خروج"} onPress={() => void handleLogout()} disabled={loggingOut} variant="secondary" size="sm" />}
    >
      {loading ? (
        <DriverLoadingCard message="جارٍ تحميل لوحة السائق..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <DriverCard variant="accent" compact>
            <View style={[styles.accountHeader, isRTL ? styles.rowReverse : null]}>
              <View style={styles.accountMeta}>
                <Text style={[styles.accountLabel, isRTL ? styles.textRight : null]}>حالة السائق</Text>
                <Text style={[styles.accountName, isRTL ? styles.textRight : null]} numberOfLines={2}>
                  {driver?.fullName ?? "السائق"}
                </Text>

                <View style={[styles.badgeRow, isRTL ? styles.rowReverse : null]}>
                  <DriverBadge label={driver?.approvalStatus ?? "غير معروف"} tone={statusTone(driver?.approvalStatus ?? "")} />
                  <DriverBadge label={driver?.isAvailable ? "متاح للاستلام" : "مشغول بتوصيل"} tone={driver?.isAvailable ? "success" : "info"} />
                </View>
              </View>

              <View style={styles.accountAction}>
                <DriverButton label="عرض الطلبات" onPress={() => router.push("/orders")} size="sm" />
              </View>
            </View>

            <DriverHelper>
              {driver?.isAvailable ? "أنت جاهز لقبول طلبات الاستلام المتاحة." : "سيعود توفر السائق تلقائيًا بعد تسليم الطلب الحالي."}
            </DriverHelper>
          </DriverCard>

          <DriverSummaryGrid>
            <DriverMetricTile label="طلبات متاحة" value={countsLoading ? "…" : String(summary.availablePickups)} hint="جاهزة للاستلام" />
            <DriverMetricTile label="توصيلاتي" value={countsLoading ? "…" : String(summary.activeDeliveries)} hint="نشطة الآن" />
            <DriverMetricTile
              label="التوفر"
              value={driver?.isAvailable ? "متاح" : "مشغول"}
              hint={summary.latestAssignedAt ? `آخر تحديث ${formatDate(summary.latestAssignedAt)}` : "محدّث الآن"}
            />
          </DriverSummaryGrid>

          <DriverSectionTitle>{nextDelivery ? "التوصيلة التالية" : "جاهز للعمل"}</DriverSectionTitle>

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
                <DriverButton
                  label="فتح التوصيلة"
                  onPress={() =>
                    router.push({
                      pathname: "/orders/[orderId]",
                      params: { orderId: nextDelivery.id },
                    })
                  }
                />
              }
              compact
            />
          ) : (
            <DriverCard compact>
              <View style={styles.readyBlock}>
                <Text style={[styles.readyTitle, isRTL ? styles.textRight : null]}>لا توجد توصيلات نشطة</Text>
                <Text style={[styles.readyText, isRTL ? styles.textRight : null]}>
                  افتح شاشة الطلبات لقبول طلب استلام أو متابعة التوصيلات المسندة.
                </Text>
              </View>

              <DriverButton label="عرض الطلبات" onPress={() => router.push("/orders")} />
            </DriverCard>
          )}

          <View style={styles.refreshAction}>
            <DriverButton label="تحديث" onPress={() => void handleRefresh()} variant="ghost" size="sm" />
          </View>
        </>
      )}
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  accountHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[12],
  },
  accountMeta: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[8],
  },
  accountLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  accountName: {
    fontSize: theme.typography.heading.md,
    lineHeight: 28,
    fontWeight: "800",
    color: theme.colors.text,
  },
  accountAction: {
    flexShrink: 0,
    maxWidth: 118,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  readyBlock: {
    gap: theme.spacing[8],
  },
  readyTitle: {
    fontSize: theme.typography.heading.md,
    lineHeight: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  readyText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 21,
  },
  refreshAction: {
    alignItems: "flex-end",
    marginTop: -theme.spacing[4],
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});
