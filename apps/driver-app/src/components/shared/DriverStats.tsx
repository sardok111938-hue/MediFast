import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useDriverI18n } from "../../lib/i18n";

export function DriverStatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <DriverMetricTile label={label} value={value} hint={hint} />;
}

export function DriverMetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={styles.statCard}>
      <Text style={[styles.statLabel, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {t(label)}
      </Text>
      <Text style={[styles.statValue, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statHint, isRTL ? styles.textRight : null]} numberOfLines={2}>
        {t(hint)}
      </Text>
    </View>
  );
}

export function DriverSummaryGrid({ children }: { children: ReactNode }) {
  return <View style={styles.summaryGrid}>{children}</View>;
}

const styles = StyleSheet.create({
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 142,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    borderColor: "#E5EEE9",
    borderWidth: 1,
    gap: theme.spacing[8],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    lineHeight: 30,
  },
  statHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },
  textRight: {
    textAlign: "right",
  },
});
