import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";
import { DriverBadge, DriverCard } from "../DriverUI";
import { useDriverI18n } from "../../lib/i18n";
import { statusTone, type DriverProfile } from "../../lib/driver-data";

export function DriverStatusSummaryCard({
  driver,
  countsLoading,
  freshnessText,
}: {
  driver: DriverProfile | null;
  countsLoading: boolean;
  freshnessText: string;
}) {
  const { isRTL } = useDriverI18n();

  return (
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
      </View>
    </DriverCard>
  );
}

const styles = StyleSheet.create({
  statusPanel: {
    gap: 9,
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  statusIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF7F2",
    alignItems: "center",
    justifyContent: "center",
  },
  accountMeta: {
    flex: 1,
    minWidth: 0,
    gap: 5,
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
    gap: 8,
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
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});
