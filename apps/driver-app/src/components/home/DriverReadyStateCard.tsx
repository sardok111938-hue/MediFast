import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";
import { DriverCard } from "../DriverUI";
import { useDriverI18n } from "../../lib/i18n";

export function DriverReadyStateCard({ availablePickups }: { availablePickups: number }) {
  const { isRTL } = useDriverI18n();

  return (
    <DriverCard variant="elevated" compact>
      <View style={[styles.readyHeader, isRTL ? styles.rowReverse : null]}>
        <View style={styles.readyIcon}>
          <Ionicons name="checkmark-circle-outline" size={22} color={theme.colors.primaryDark} />
        </View>
        <View style={styles.readyBlock}>
          <Text style={[styles.readyTitle, isRTL ? styles.textRight : null]}>لا توجد توصيلات نشطة</Text>
          <Text style={[styles.readyText, isRTL ? styles.textRight : null]}>راقب الطلبات المتاحة واقبل أقرب استلام عند ظهوره.</Text>
        </View>
      </View>

    </DriverCard>
  );
}

const styles = StyleSheet.create({
  readyHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  readyIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EEF7F2",
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
    paddingTop: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});
