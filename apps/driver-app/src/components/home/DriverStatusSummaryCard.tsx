import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";

import { DriverBadge, DriverCard } from "../DriverUI";
import { useDriverI18n } from "../../lib/i18n";
import { type DriverProfile } from "../../lib/driver-data";

export function DriverStatusSummaryCard({
  driver,
  isBusy,
}: {
  driver: DriverProfile | null;
  isBusy: boolean;
}) {
  const { isRTL } = useDriverI18n();
  const isAvailable = !isBusy;

  return (
    <DriverCard variant="accent" compact>
      <View style={styles.cardContent}>
        <View style={[styles.nameRow, isRTL ? styles.rowReverse : null]}>
          <Ionicons name="bicycle-outline" size={18} color={theme.colors.primaryDark} />

          <Text
            style={[styles.accountName, isRTL ? styles.textRight : null]}
            numberOfLines={1}
          >
            {driver?.fullName ?? "السائق"}
          </Text>
        </View>

        <View style={[styles.badgeRow, isRTL ? styles.rowReverse : null]}>
          <DriverBadge
            label={isAvailable ? "متاح" : "مشغول"}
            tone={isAvailable ? "success" : "info"}
          />
        </View>
      </View>
    </DriverCard>
  );
}

const styles = StyleSheet.create({
  cardContent: {
    gap: 10,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badgeRow: {
    flexDirection: "row",
  },
  accountName: {
    flex: 1,
    minWidth: 0,
    fontSize: theme.typography.heading.md,
    lineHeight: 28,
    fontWeight: "900",
    color: theme.colors.text,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});