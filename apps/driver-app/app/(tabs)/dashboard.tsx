import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  DriverBadge,
  DriverButton,
  DriverCard,
  DriverErrorCard,
  DriverLoadingCard,
  DriverOrderCard,
  DriverScreen,
  shortOrderRef,
} from "../../src/components/DriverUI";
import { theme } from "@medifast/ui";
import { formatDate, getStatusLabel, listAvailablePickupOrders, listCurrentDriverOrders, normalizeError, statusTone, type DriverOrder } from "../../src/lib/driver-data";
import { useDriverI18n } from "../../src/lib/i18n";
import { useDriverSession } from "../../src/hooks/use-driver-session";

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

  const nextDelivery = summary.nextDelivery;
  const freshnessText = summary.latestAssignedAt ? `آخر توصيل ${formatDate(summary.latestAssignedAt)}` : "محدّث الآن";

  return (
    <DriverScreen
      title={driver?.fullName ? `أهلًا ${driver.fullName}` : "الرئيسية"}
      subtitle={freshnessText}
      compactHeader
    >
      {loading ? (
        <DriverLoadingCard message="جارٍ تحميل لوحة السائق..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <DriverCard variant="accent" compact>
            <View style={styles.statusPanel}>
              <View style={[styles.statusTop, isRTL ? styles.rowReverse : null]}>
                <View style={styles.statusIcon}>
                  <Ionicons name={driver?.isAvailable ? "bicycle-outline" : "navigate-outline"} size={22} color={theme.colors.primaryDark} />
                </View>

                <View style={styles.accountMeta}>
                  <View style={[styles.statusLabelRow, isRTL ? styles.rowReverse : null]}>
                    <Text style={[styles.accountLabel, isRTL ? styles.textRight : null]}>حالة السائق</Text>
                    <Ionicons name="radio-outline" size={14} color={theme.colors.primaryDark} />
                  </View>
                  <Text style={[styles.accountName, isRTL ? styles.textRight : null]} numberOfLines={1}>
                    {driver?.fullName ?? "السائق"}
                  </Text>

                  <View style={[styles.badgeRow, isRTL ? styles.rowReverse : null]}>
                    <DriverBadge label={driver?.approvalStatus ?? "غير معروف"} tone={statusTone(driver?.approvalStatus ?? "")} />
                    <DriverBadge label={driver?.isAvailable ? "متاح" : "في مهمة"} tone={driver?.isAvailable ? "success" : "info"} />
                  </View>
                </View>
              </View>

              <View style={[styles.statusMessageRow, isRTL ? styles.rowReverse : null]}>
                <Text style={[styles.statusMessage, isRTL ? styles.textRight : null]}>
                  {driver?.isAvailable ? "جاهز لقبول طلب استلام قريب." : "تابع التوصيلة الحالية حتى الإغلاق."}
                </Text>
                <Text style={styles.freshnessText}>{countsLoading ? "جارٍ التحديث..." : freshnessText}</Text>
              </View>

              <DriverButton label="عرض الطلبات" onPress={() => router.push("/(tabs)/orders")} size="sm" />
            </View>
          </DriverCard>

          <View style={styles.metricRow}>
            <CompactMetric icon="cube-outline" label="متاحة" value={countsLoading ? "…" : String(summary.availablePickups)} />
            <CompactMetric icon="navigate-outline" label="نشطة" value={countsLoading ? "…" : String(summary.activeDeliveries)} />
            <CompactMetric icon="time-outline" label="الحالة" value={driver?.isAvailable ? "جاهز" : "مشغول"} />
          </View>

          <View style={[styles.sectionLine, isRTL ? styles.rowReverse : null]}>
            <View style={[styles.sectionTitleWrap, isRTL ? styles.rowReverse : null]}>
              <Ionicons name={nextDelivery ? "trail-sign-outline" : "flash-outline"} size={18} color={theme.colors.primaryDark} />
              <Text style={styles.sectionText}>{nextDelivery ? "التوصيلة التالية" : "جاهز للعمل"}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.75} style={styles.refreshChip} onPress={() => void handleRefresh()}>
              <Ionicons name="refresh-outline" size={14} color={theme.colors.primaryDark} />
              <Text style={styles.refreshChipText}>تحديث</Text>
            </TouchableOpacity>
          </View>

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
                      pathname: "/(tabs)/orders/[orderId]",
                      params: { orderId: nextDelivery.id },
                    })
                  }
                />
              }
              compact
            />
          ) : (
            <DriverCard variant="elevated" compact>
              <View style={[styles.readyHeader, isRTL ? styles.rowReverse : null]}>
                <View style={styles.readyIcon}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.primaryDark} />
                </View>
                <View style={styles.readyBlock}>
                  <Text style={[styles.readyTitle, isRTL ? styles.textRight : null]}>لا توجد توصيلات نشطة</Text>
                  <Text style={[styles.readyText, isRTL ? styles.textRight : null]}>
                    راقب الطلبات المتاحة واقبل أقرب استلام عند ظهوره.
                  </Text>
                </View>
              </View>

              <View style={[styles.readyFooter, isRTL ? styles.rowReverse : null]}>
                <Text style={[styles.readyText, isRTL ? styles.textRight : null]}>
                  {summary.availablePickups > 0 ? `${summary.availablePickups} طلب جاهز للاستلام` : "سنحدّث الحالة عند وصول طلب جديد."}
                </Text>
                <DriverButton label="عرض الطلبات" onPress={() => router.push("/(tabs)/orders")} size="sm" />
              </View>
            </DriverCard>
          )}
        </>
      )}
    </DriverScreen>
  );
}

function CompactMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.compactMetric}>
      <View style={styles.metricIcon}>
        <Ionicons name={icon} size={17} color={theme.colors.primaryDark} />
      </View>
      <Text style={styles.compactMetricValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.compactMetricLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusPanel: {
    gap: 10,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  statusIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DFF4E8",
    alignItems: "center",
    justifyContent: "center",
  },
  accountMeta: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  statusLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
  },
  accountLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  accountName: {
    fontSize: theme.typography.body.lg,
    lineHeight: 24,
    fontWeight: "800",
    color: theme.colors.text,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  statusMessageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
    alignItems: "center",
  },
  statusMessage: {
    flex: 1,
    minWidth: 0,
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    lineHeight: 20,
  },
  freshnessText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    lineHeight: 16,
  },
  metricRow: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: theme.spacing[8],
},
  compactMetric: {
  flexGrow: 1,
  flexBasis: "31%",
  minWidth: 105,
    backgroundColor: theme.colors.surface,
    borderColor: "#E5EEE9",
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: theme.spacing[4],
    alignItems: "flex-end",
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F0F8F4",
    alignItems: "center",
    justifyContent: "center",
  },
  compactMetricValue: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    lineHeight: 28,
    fontWeight: "800",
    textAlign: "right",
  },
  compactMetricLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    lineHeight: 15,
    fontWeight: "800",
    textAlign: "right",
  },
  sectionLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    marginTop: -theme.spacing[4],
  },
  sectionTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sectionText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    lineHeight: 24,
    fontWeight: "800",
  },
  refreshChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    borderRadius: 999,
    backgroundColor: "#EEF7F2",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 6,
  },
  refreshChipText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  readyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  readyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFFAF4",
    alignItems: "center",
    justifyContent: "center",
  },
  readyBlock: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[4],
  },
  readyTitle: {
    fontSize: theme.typography.body.lg,
    lineHeight: 23,
    fontWeight: "800",
    color: theme.colors.text,
  },
  readyText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 21,
  },
  readyFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EDF2EF",
    paddingTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});
