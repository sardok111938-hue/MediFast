import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCustomerI18n } from "../../infrastructure/i18n/CustomerI18nProvider";
import { renderTranslatedText } from "./helpers";

export function SectionTitle({
  label,
  actionLabel,
  onAction,
}: {
  label: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { t, isRTL } = useCustomerI18n();

  return (
    <View style={[styles.sectionHeader, isRTL ? styles.sectionHeaderRtl : null]}>
      <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction}>
          <Text style={styles.sectionAction}>{t(actionLabel)}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function HelperText({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "danger" | "success" | "info";
}) {
  const { t, isRTL } = useCustomerI18n();

  return (
    <Text
      style={[
        styles.helperText,
        tone === "danger" ? styles.helperDanger : null,
        tone === "success" ? styles.helperSuccess : null,
        tone === "info" ? styles.helperInfo : null,
        isRTL ? styles.textRight : null,
      ]}
    >
      {renderTranslatedText(children, t)}
    </Text>
  );
}

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const { t, isRTL } = useCustomerI18n();
  const renderedValue = renderTranslatedText(value, t);
  const isTextValue = typeof renderedValue === "string" || typeof renderedValue === "number";

  return (
    <View style={[styles.detailRow, isRTL ? styles.detailRowRtl : null]}>
      <Text style={[styles.detailLabel, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      {isTextValue ? (
        <Text style={[styles.detailValue, isRTL ? styles.detailValueRtl : null]}>{renderedValue}</Text>
      ) : (
        <View style={styles.detailNodeWrap}>{renderedValue}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  textRight: {
    textAlign: "right",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionHeaderRtl: {
    flexDirection: "row-reverse",
  },
  sectionTitle: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 32,
    paddingTop: 2,
  },
  sectionAction: {
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
  },
  helperText: {
    fontSize: theme.typography.caption.md,
    color: theme.colors.muted,
    lineHeight: theme.typography.lineHeight.compact,
  },
  helperDanger: {
    color: theme.colors.danger,
  },
  helperSuccess: {
    color: theme.colors.success,
  },
  helperInfo: {
    color: theme.colors.info,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "center",
  },
  detailRowRtl: {
    flexDirection: "row-reverse",
  },
  detailLabel: {
    color: theme.colors.muted,
    fontWeight: "700",
    flex: 1,
    fontSize: theme.typography.body.sm,
  },
  detailValue: {
    color: theme.colors.text,
    flex: 1.3,
    textAlign: "right",
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
    minWidth: 0,
  },
  detailValueRtl: {
    textAlign: "right",
  },
  detailNodeWrap: {
    flex: 1.3,
    alignItems: "flex-end",
    minWidth: 0,
  },
});
