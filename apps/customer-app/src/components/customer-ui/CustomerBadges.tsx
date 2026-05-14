import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";
import { useCustomerI18n } from "../../lib/i18n";
import type { IconName } from "./helpers";

export function Pill({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "info";
  icon?: IconName;
}) {
  const { t } = useCustomerI18n();

  return (
    <View
      style={[
        styles.pill,
        tone === "success" ? styles.pillSuccess : null,
        tone === "warning" ? styles.pillWarning : null,
        tone === "info" ? styles.pillInfo : null,
      ]}
    >
      {icon ? <Ionicons name={icon} size={14} color={theme.colors.primaryDark} /> : null}
      <Text style={styles.pillText}>{t(label)}</Text>
    </View>
  );
}

export function StatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "warning" | "success" | "danger" | "info";
}) {
  const { t } = useCustomerI18n();

  return (
    <View
      style={[
        styles.statusBadge,
        tone === "warning" ? styles.statusBadgeWarning : null,
        tone === "success" ? styles.statusBadgeSuccess : null,
        tone === "danger" ? styles.statusBadgeDanger : null,
        tone === "info" ? styles.statusBadgeInfo : null,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          tone === "warning" ? styles.statusBadgeTextWarning : null,
          tone === "success" ? styles.statusBadgeTextSuccess : null,
          tone === "danger" ? styles.statusBadgeTextDanger : null,
          tone === "info" ? styles.statusBadgeTextInfo : null,
        ]}
      >
        {t(label)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 6,
    borderRadius: 999,
  },
  pillSuccess: {
    backgroundColor: theme.status.success.background,
  },
  pillWarning: {
    backgroundColor: theme.status.warning.background,
  },
  pillInfo: {
    backgroundColor: theme.status.info.background,
  },
  pillText: {
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: theme.typography.caption.md,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: theme.status.neutral.background,
  },
  statusBadgeWarning: {
    backgroundColor: theme.status.warning.background,
  },
  statusBadgeSuccess: {
    backgroundColor: theme.status.success.background,
  },
  statusBadgeDanger: {
    backgroundColor: theme.status.danger.background,
  },
  statusBadgeInfo: {
    backgroundColor: theme.status.info.background,
  },
  statusBadgeText: {
    color: theme.status.neutral.text,
    fontWeight: "800",
    fontSize: theme.typography.caption.sm,
  },
  statusBadgeTextWarning: {
    color: theme.status.warning.text,
  },
  statusBadgeTextSuccess: {
    color: theme.status.success.text,
  },
  statusBadgeTextDanger: {
    color: theme.status.danger.text,
  },
  statusBadgeTextInfo: {
    color: theme.status.info.text,
  },
});
