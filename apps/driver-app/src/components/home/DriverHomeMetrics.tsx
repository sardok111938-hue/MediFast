import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";

export function DriverHomeMetrics({
  availablePickups,
  activeDeliveries,
  isAvailable,
  loading,
}: {
  availablePickups: number;
  activeDeliveries: number;
  isAvailable?: boolean;
  loading: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <CompactMetric icon="cube-outline" label="طلبات متاحة" value={loading ? "…" : String(availablePickups)} />
      <CompactMetric icon="navigate-outline" label="توصيلاتي الحالية" value={loading ? "…" : String(activeDeliveries)} />
      <CompactMetric icon="time-outline" label="الحالة" value={isAvailable ? "جاهز" : "مشغول"} />
    </View>
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
    borderRadius: theme.radius.md,
    paddingHorizontal: 9,
    paddingVertical: 9,
    gap: theme.spacing[4],
    alignItems: "flex-end",
  },
  metricIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#EEF7F2",
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
});
