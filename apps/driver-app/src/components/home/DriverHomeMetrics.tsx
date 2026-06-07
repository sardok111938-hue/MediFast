import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";

export function DriverHomeMetrics({
  availablePickups,
  activeDeliveries,
  loading,
}: {
  availablePickups: number;
  activeDeliveries: number;
  loading: boolean;
}) {
  return (
    <View style={styles.metricRow}>
      <CompactMetric
        label="طلبات متاحة"
        value={loading ? "…" : String(availablePickups)}
      />

      <CompactMetric
        label="توصيلاتي الحالية"
        value={loading ? "…" : String(activeDeliveries)}
      />
    </View>
  );
}

function CompactMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <View style={styles.compactMetric}>
      <Text style={styles.compactMetricLabel} numberOfLines={1}>
        {label}
      </Text>

      <Text style={styles.compactMetricValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: "row",
    gap: theme.spacing[8],
  },
  compactMetric: {
    flex: 1,
    minHeight: 90,
    backgroundColor: theme.colors.surface,
    borderColor: "#E4EEE8",
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  compactMetricLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "center",
  },
  compactMetricValue: {
    color: theme.colors.text,
    fontSize: 32,
    lineHeight: 36,
    fontWeight: "900",
    textAlign: "center",
  },
});