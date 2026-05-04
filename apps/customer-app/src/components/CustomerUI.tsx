import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomerI18n } from "../lib/i18n";

function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}

export function Screen({
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
  const { t, isRTL } = useCustomerI18n();
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

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function ListCard({
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
  const { t, isRTL } = useCustomerI18n();

  return (
    <Card>
      <View style={[styles.listCardHeader, isRTL ? styles.listCardHeaderRtl : null]}>
        <View style={styles.listCardText}>
          <Text style={[styles.listCardTitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(title, t)}</Text>
          {subtitle ? <Text style={[styles.listCardSubtitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(subtitle, t)}</Text> : null}
        </View>
        {badge ? <View>{badge}</View> : null}
      </View>
      {children ? <View style={styles.listCardBody}>{children}</View> : null}
    </Card>
  );
}

export function Pill({ label }: { label: string }) {
  const { t } = useCustomerI18n();
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{t(label)}</Text>
    </View>
  );
}

export function SectionTitle({ label }: { label: string }) {
  const { t, isRTL } = useCustomerI18n();
  return <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>{t(label)}</Text>;
}

export function SearchInput({ placeholder }: { placeholder: string }) {
  const { t } = useCustomerI18n();
  return (
    <View style={styles.searchWrap}>
      <Ionicons name="search" size={18} color={theme.colors.muted} />
      <TextInput placeholder={t(placeholder)} placeholderTextColor={theme.colors.muted} style={styles.searchInput} />
    </View>
  );
}

export function FormInput({
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
  const { t } = useCustomerI18n();
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t(placeholder)}
      placeholderTextColor={theme.colors.muted}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      style={styles.formInput}
    />
  );
}

export function HelperText({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "danger" | "success" | "info" }) {
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

export function PrimaryButton({
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
  const { t } = useCustomerI18n();
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

export function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  const { t, isRTL } = useCustomerI18n();
  return (
    <View style={[styles.detailRow, isRTL ? styles.detailRowRtl : null]}>
      <Text style={[styles.detailLabel, isRTL ? styles.textRight : null]}>{t(label)}</Text>
      <Text style={[styles.detailValue, isRTL ? styles.detailValueRtl : null]}>{renderTranslatedText(value, t)}</Text>
    </View>
  );
}

export function LoadingCard({ message }: { message: string }) {
  const { t } = useCustomerI18n();

  return (
    <Card>
      <Text style={styles.stateIcon}>...</Text>
      <Text style={styles.stateTitle}>{t("Loading")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </Card>
  );
}

export function EmptyCard({ title, message }: { title: string; message: string }) {
  const { t } = useCustomerI18n();

  return (
    <Card>
      <Text style={styles.stateIcon}>-</Text>
      <Text style={styles.stateTitle}>{t(title)}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </Card>
  );
}

export function ErrorCard({
  message,
  retryLabel = "Retry",
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { t } = useCustomerI18n();

  return (
    <Card>
      <Text style={styles.stateIcon}>!</Text>
      <Text style={styles.stateTitle}>{t("Something went wrong")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {onRetry ? <PrimaryButton label={retryLabel} onPress={onRetry} /> : null}
    </Card>
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
  title: { fontSize: theme.typography.heading.xl, fontWeight: "800", color: theme.colors.text, marginTop: theme.spacing[4] },
  subtitle: { fontSize: theme.typography.body.md, lineHeight: theme.typography.lineHeight.body, color: theme.colors.muted },
  textRight: { textAlign: "right" },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[20],
    borderWidth: 1,
    borderColor: theme.colors.border,
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
  listCardTitle: { fontSize: theme.typography.heading.md, fontWeight: "800", color: theme.colors.text },
  listCardSubtitle: { color: theme.colors.muted, fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.compact },
  pill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: 999,
  },
  pillText: { color: theme.colors.primaryDark, fontWeight: "700" },
  sectionTitle: { fontSize: theme.typography.heading.md, fontWeight: "700", color: theme.colors.text, marginTop: theme.spacing[4] },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: theme.typography.body.md, textAlign: "right" },
  formInput: {
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
  },
  helperText: { fontSize: theme.typography.caption.md, color: theme.colors.muted, lineHeight: theme.typography.lineHeight.compact },
  helperDanger: { color: theme.colors.danger },
  helperSuccess: { color: theme.colors.success },
  helperInfo: { color: theme.colors.info },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[16],
    paddingHorizontal: theme.spacing[20],
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    alignItems: "flex-end",
    minHeight: 40,
    paddingHorizontal: 0,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: theme.typography.body.lg },
  buttonTextSecondary: { color: theme.colors.text },
  buttonTextGhost: { color: theme.colors.primaryDark, fontSize: theme.typography.body.md },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: 999,
    backgroundColor: theme.status.neutral.background,
  },
  statusBadgeWarning: { backgroundColor: theme.status.warning.background },
  statusBadgeSuccess: { backgroundColor: theme.status.success.background },
  statusBadgeDanger: { backgroundColor: theme.status.danger.background },
  statusBadgeInfo: { backgroundColor: theme.status.info.background },
  statusBadgeText: { color: theme.status.neutral.text, fontWeight: "800", textTransform: "capitalize", fontSize: theme.typography.caption.sm },
  statusBadgeTextWarning: { color: theme.status.warning.text },
  statusBadgeTextSuccess: { color: theme.status.success.text },
  statusBadgeTextDanger: { color: theme.status.danger.text },
  statusBadgeTextInfo: { color: theme.status.info.text },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  detailRowRtl: {
    flexDirection: "row-reverse",
  },
  detailLabel: { color: theme.colors.muted, fontWeight: "700", flex: 1, fontSize: theme.typography.body.sm },
  detailValue: { color: theme.colors.text, flex: 1.4, textAlign: "right", fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.compact },
  detailValueRtl: { textAlign: "right" },
  stateIcon: { fontSize: theme.typography.heading.lg, fontWeight: "800", color: theme.colors.primaryDark, textAlign: "center" },
  stateTitle: { fontSize: theme.typography.heading.md, fontWeight: "800", color: theme.colors.text, textAlign: "center" },
  stateMessage: { fontSize: theme.typography.body.sm, lineHeight: theme.typography.lineHeight.body, color: theme.colors.muted, textAlign: "center" },
});
