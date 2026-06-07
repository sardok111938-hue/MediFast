import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useDriverI18n } from "../../lib/i18n";

export function DriverHomeSectionHeader({
  hasDelivery,
  onRefresh,
}: {
  hasDelivery: boolean;
  onRefresh: () => void;
}) {
  const { isRTL } = useDriverI18n();

  return (
    <View style={[styles.sectionLine, isRTL ? styles.rowReverse : null]}>
      <View style={[styles.sectionTitleWrap, isRTL ? styles.rowReverse : null]}>
        <Ionicons
          name={hasDelivery ? "trail-sign-outline" : "flash-outline"}
          size={18}
          color={theme.colors.primaryDark}
        />
        <Text style={styles.sectionText}>
          {hasDelivery ? "التوصيلة الحالية" : "جاهز للعمل"}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        style={styles.refreshChip}
        onPress={onRefresh}
      >
        <Ionicons
          name="refresh-outline"
          size={14}
          color="#C2410C"
        />
        <Text style={styles.refreshChipText}>تحديث</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: "#FFF4E5",
    borderWidth: 1,
    borderColor: "#FED7AA",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 6,
  },
  refreshChipText: {
    color: "#C2410C",
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});