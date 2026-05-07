import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverI18n } from "../lib/i18n";

function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}

export function DriverScreen({
  title,
  subtitle,
  children,
  action,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={[styles.title, isRTL ? styles.textRight : null]}>{t(title)}</Text>
          {subtitle ? <Text style={[styles.subtitle, isRTL ? styles.textRight : null]}>{t(subtitle)}</Text> : null}
        </View>
        <View style={[styles.headerActions, isRTL ? styles.headerActionsRtl : null]}>
          {action ? <View>{action}</View> : null}
        </View>
      </View>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.screen}>{content}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
        {content}
      </ScrollView>
    </SafeAreaView>
  );
}

export function DriverCard({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function DriverListCard({
  title,
  subtitle,
  badge,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <DriverCard>
      <View style={[styles.listCardHeader, isRTL ? styles.listCardHeaderRtl : null]}>
        <View style={styles.listCardText}>
          <Text style={[styles.listCardTitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(title, t)}</Text>
          {subtitle ? <Text style={[styles.listCardSubtitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(subtitle, t)}</Text> : null}
        </View>
        {badge ? <View>{badge}</View> : null}
      </View>
      {children ? <View style={styles.listCardBody}>{children}</View> : null}
    </DriverCard>
  );
}

export function DriverInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
}) {
  const { t } = useDriverI18n();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t(placeholder)}
      placeholderTextColor={theme.colors.muted}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      style={styles.input}
    />
  );
}

export function DriverHelper({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" | "success" }) {
  const { t, isRTL } = useDriverI18n();
  return (
    <Text
      style={[
        styles.helper,
        tone === "danger" ? styles.helperDanger : null,
        tone === "success" ? styles.helperSuccess : null,
        isRTL ? styles.textRight : null,
      ]}
    >
      {renderTranslatedText(children, t)}
    </Text>
  );
}

export function DriverButton({
  label,
  onPress,
  disabled,
  variant = "primary",
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}) {
  const { t } = useDriverI18n();
  return (
    <TouchableOpacity
      style={[
        styles.button,
        variant === "secondary" ? styles.buttonSecondary : null,
        variant === "ghost" ? styles.buttonGhost : null,
        disabled || loading ? styles.buttonDisabled : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <Text
        style={[
          styles.buttonText,
          variant === "secondary" ? styles.buttonTextSecondary : null,
          variant === "ghost" ? styles.buttonTextGhost : null,
        ]}
      >
        {t(label)}
      </Text>
    </TouchableOpacity>
  );
}

export function DriverStatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  const { t, isRTL } = useDriverI18n();
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statLabel, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={[styles.statHint, isRTL ? styles.textRight : null]}>{t(hint)}</Text>
    </View>
  );
}

export function DriverBadge({ label, tone = "neutral" }: { label: string; tone?: "neutral" | "warning" | "success" | "danger" | "info" }) {
  const { t } = useDriverI18n();
  return (
    <View
      style={[
        styles.badge,
        tone === "warning" ? styles.badgeWarning : null,
        tone === "success" ? styles.badgeSuccess : null,
        tone === "danger" ? styles.badgeDanger : null,
        tone === "info" ? styles.badgeInfo : null,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          tone === "warning" ? styles.badgeTextWarning : null,
          tone === "success" ? styles.badgeTextSuccess : null,
          tone === "danger" ? styles.badgeTextDanger : null,
          tone === "info" ? styles.badgeTextInfo : null,
        ]}
      >
          {t(label)}
      </Text>
    </View>
  );
}

export function DriverSectionTitle({ children }: { children: ReactNode }) {
  const { t, isRTL } = useDriverI18n();
  return <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(children, t)}</Text>;
}

export function DriverRow({
  label,
  value,
  valueTone = "default",
}: {
  label: string;
  value: ReactNode;
  valueTone?: "default" | "muted";
}) {
  const { t, isRTL } = useDriverI18n();
  return (
    <View style={[styles.row, isRTL ? styles.rowRtl : null]}>
      <Text style={[styles.rowLabel, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      <Text style={[styles.rowValue, valueTone === "muted" ? styles.rowValueMuted : null, isRTL ? styles.rowValueRtl : null]}>
        {renderTranslatedText(value, t)}
      </Text>
    </View>
  );
}

export function DriverLoadingCard({ message }: { message: string }) {
  const { t } = useDriverI18n();

  return (
    <DriverCard>
      <Text style={styles.stateIcon}>...</Text>
      <Text style={styles.stateTitle}>{t("Loading")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </DriverCard>
  );
}

export function DriverEmptyCard({ title, message }: { title: string; message: string }) {
  const { t } = useDriverI18n();

  return (
    <DriverCard>
      <Text style={styles.stateIcon}>-</Text>
      <Text style={styles.stateTitle}>{t(title)}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </DriverCard>
  );
}

export function DriverErrorCard({
  message,
  retryLabel = "Retry",
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { t } = useDriverI18n();

  return (
    <DriverCard>
      <Text style={styles.stateIcon}>!</Text>
      <Text style={styles.stateTitle}>{t("Something went wrong")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {onRetry ? <DriverButton label={retryLabel} onPress={onRetry} /> : null}
    </DriverCard>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  screen: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: theme.spacing[32] },
  content: { padding: theme.spacing[20], gap: theme.spacing[16] },
  header: { gap: theme.spacing[12] },
  headerText: { gap: theme.spacing[8] },
  headerActions: { flexDirection: "row", gap: theme.spacing[8], alignItems: "center", justifyContent: "flex-end" },
  headerActionsRtl: { flexDirection: "row-reverse" },
  title: { fontSize: theme.typography.heading.xl, fontWeight: "800", color: theme.colors.text, marginTop: theme.spacing[4], lineHeight: theme.typography.lineHeight.body },
  subtitle: { color: theme.colors.muted, lineHeight: theme.typography.lineHeight.body, fontSize: theme.typography.body.md },
  textRight: { textAlign: "right" },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[20],
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: theme.shadows.card.shadowOpacity,
    shadowRadius: theme.shadows.card.shadowRadius,
    shadowOffset: theme.shadows.card.shadowOffset,
    elevation: theme.shadows.card.elevation,
  },
  listCardHeader: { flexDirection: "row", justifyContent: "space-between", gap: theme.spacing[12], alignItems: "flex-start" },
  listCardHeaderRtl: { flexDirection: "row-reverse" },
  listCardText: { flex: 1, gap: theme.spacing[4] },
  listCardBody: { gap: theme.spacing[12] },
  listCardTitle: { fontSize: theme.typography.heading.md, fontWeight: "800", color: theme.colors.text, lineHeight: theme.typography.lineHeight.body },
  listCardSubtitle: { color: theme.colors.muted, fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.compact },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    minHeight: 52,
    fontSize: theme.typography.body.md,
    textAlign: "right",
    writingDirection: "rtl",
  },
  helper: { fontSize: theme.typography.caption.md, color: theme.colors.muted, lineHeight: theme.typography.lineHeight.compact },
  helperDanger: { color: theme.colors.danger },
  helperSuccess: { color: theme.colors.primaryDark },
  button: {
    backgroundColor: theme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: theme.spacing[16],
    paddingHorizontal: theme.spacing[20],
    borderRadius: 999,
    minHeight: 54,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    minHeight: 40,
    alignItems: "flex-end",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: theme.typography.body.lg, textAlign: "center", lineHeight: theme.typography.lineHeight.compact },
  buttonTextSecondary: { color: theme.colors.text },
  buttonTextGhost: { color: theme.colors.primaryDark, fontSize: theme.typography.body.md },
  statCard: {
    flex: 1,
    minWidth: 150,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[20],
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: theme.spacing[8],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: theme.shadows.card.shadowOpacity,
    shadowRadius: theme.shadows.card.shadowRadius,
    shadowOffset: theme.shadows.card.shadowOffset,
    elevation: theme.shadows.card.elevation,
  },
  statLabel: { color: theme.colors.muted, fontSize: theme.typography.caption.md, fontWeight: "700" },
  statValue: { color: theme.colors.text, fontSize: theme.typography.heading.xl, fontWeight: "800" },
  statHint: { color: theme.colors.muted, fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.compact },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: 999,
    backgroundColor: theme.status.neutral.background,
  },
  badgeWarning: { backgroundColor: theme.status.warning.background },
  badgeSuccess: { backgroundColor: theme.status.success.background },
  badgeDanger: { backgroundColor: theme.status.danger.background },
  badgeInfo: { backgroundColor: theme.status.info.background },
  badgeText: { fontWeight: "800", fontSize: theme.typography.caption.sm, color: theme.status.neutral.text, textTransform: "capitalize" },
  badgeTextWarning: { color: theme.status.warning.text },
  badgeTextSuccess: { color: theme.status.success.text },
  badgeTextDanger: { color: theme.status.danger.text },
  badgeTextInfo: { color: theme.status.info.text },
  sectionTitle: { fontSize: theme.typography.heading.md, fontWeight: "800", color: theme.colors.text },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  rowRtl: { flexDirection: "row-reverse" },
  rowLabel: { color: theme.colors.muted, fontWeight: "700", flex: 1, fontSize: theme.typography.body.sm },
  rowValue: { color: theme.colors.text, flex: 1.3, textAlign: "right", fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.compact, minWidth: 0 },
  rowValueMuted: { color: theme.colors.muted },
  rowValueRtl: { textAlign: "right" },
  stateIcon: { fontSize: theme.typography.heading.lg, fontWeight: "800", color: theme.colors.primaryDark, textAlign: "center" },
  stateTitle: { fontSize: theme.typography.heading.md, fontWeight: "800", color: theme.colors.text, textAlign: "center" },
  stateMessage: { fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.body, color: theme.colors.muted, textAlign: "center" },
});
