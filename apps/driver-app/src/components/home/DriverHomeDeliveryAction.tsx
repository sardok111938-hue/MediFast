import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { useDriverI18n } from "../../lib/i18n";

export function DriverHomeDeliveryAction({ onPress }: { onPress: () => void }) {
  const { isRTL } = useDriverI18n();

  return (
    <TouchableOpacity activeOpacity={0.76} style={[styles.deliveryLink, isRTL ? styles.rowReverse : null]} onPress={onPress}>
      <Ionicons name="chevron-back" size={16} color={theme.colors.primaryDark} />
      <Text style={styles.deliveryLinkText}>عرض التفاصيل</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  deliveryLink: {
    minHeight: 40,
    borderRadius: 999,
    backgroundColor: "#EEF7F2",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[4],
  },
  deliveryLinkText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "800",
    lineHeight: 18,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
});
