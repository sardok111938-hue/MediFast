import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, type TextInputProps } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverI18n } from "../../lib/i18n";

function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}

export function shortOrderRef(orderId: string) {
  return `#${orderId.slice(0, 8)}`;
}

export function DriverTopBar({
  title,
  subtitle,
  action,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  compact?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.header, compact ? styles.headerCompact : null, isRTL ? styles.headerRtl : null]}>
      <View style={styles.headerText}>
        <Text style={[styles.title, compact ? styles.titleCompact : null, isRTL ? styles.textRight : null]} numberOfLines={2}>
          {t(title)}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, compact ? styles.subtitleCompact : null, isRTL ? styles.textRight : null]} numberOfLines={2}>
            {t(subtitle)}
          </Text>
        ) : null}
      </View>
      {action ? <View style={styles.headerAction}>{action}</View> : null}
    </View>
  );
}

export function DriverScreen({
  title,
  subtitle,
  children,
  action,
  scroll = true,
  compactHeader = false,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
  compactHeader?: boolean;
}) {
  const content = (
    <View style={styles.content}>
      <DriverTopBar title={title} subtitle={subtitle} action={action} compact={compactHeader} />
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      {scroll ? (
        <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        <View style={styles.screen}>{content}</View>
      )}
    </SafeAreaView>
  );
}

export function DriverCard({
  children,
  variant = "default",
  compact = false,
}: {
  children: ReactNode;
  variant?: "default" | "accent" | "subtle" | "elevated";
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        compact ? styles.cardCompact : null,
        variant === "accent" ? styles.cardAccent : null,
        variant === "subtle" ? styles.cardSubtle : null,
        variant === "elevated" ? styles.cardElevated : null,
      ]}
    >
      {children}
    </View>
  );
}

export function DriverInput({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  ...textInputProps
}: {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
} & Omit<TextInputProps, "value" | "onChangeText" | "placeholder" | "placeholderTextColor" | "secureTextEntry" | "style">) {
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
      {...textInputProps}
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
  size = "md",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useDriverI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[
        styles.button,
        size === "sm" ? styles.buttonSm : null,
        size === "lg" ? styles.buttonLg : null,
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
          size === "sm" ? styles.buttonTextSm : null,
          variant === "secondary" ? styles.buttonTextSecondary : null,
          variant === "ghost" ? styles.buttonTextGhost : null,
        ]}
        numberOfLines={1}
      >
        {t(label)}
      </Text>
    </TouchableOpacity>
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
        numberOfLines={1}
      >
        {t(label)}
      </Text>
    </View>
  );
}

export function DriverSectionTitle({ children }: { children: ReactNode }) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.sectionHeader, isRTL ? styles.sectionHeaderRtl : null]}>
      <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(children, t)}</Text>
    </View>
  );
}

export function DriverLoadingCard({ message }: { message: string }) {
  const { t } = useDriverI18n();

  return (
    <DriverCard variant="subtle">
      <Text style={styles.stateIcon}>…</Text>
      <Text style={styles.stateTitle}>جارٍ التحميل</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </DriverCard>
  );
}

export function DriverEmptyCard({ title, message }: { title: string; message: string }) {
  const { t } = useDriverI18n();

  return (
    <DriverCard variant="subtle">
      <Text style={styles.stateIcon}>—</Text>
      <Text style={styles.stateTitle}>{t(title)}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </DriverCard>
  );
}

export function DriverErrorCard({
  message,
  retryLabel = "إعادة المحاولة",
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { t } = useDriverI18n();

  return (
    <DriverCard variant="subtle">
      <Text style={styles.stateIcon}>!</Text>
      <Text style={styles.stateTitle}>تعذر إكمال العملية</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {onRetry ? <DriverButton label={retryLabel} onPress={onRetry} /> : null}
    </DriverCard>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F7FBF8",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F7FBF8",
  },
  scrollContent: {
    paddingBottom: theme.spacing[32],
  },
  content: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[24],
    gap: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    paddingBottom: theme.spacing[8],
  },
  headerRtl: {
    flexDirection: "row-reverse",
  },
  headerCompact: {
    paddingBottom: theme.spacing[4],
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[4],
  },
  headerAction: {
    flexShrink: 0,
    maxWidth: 116,
  },
  title: {
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 28,
  },
  titleCompact: {
    fontSize: theme.typography.body.lg,
    lineHeight: 24,
  },
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 20,
    fontSize: theme.typography.body.sm,
  },
  subtitleCompact: {
    fontSize: theme.typography.caption.md,
    lineHeight: 18,
  },
  textRight: {
    textAlign: "right",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: 15,
    borderColor: "#E5EEE9",
    borderWidth: 1,
    gap: 11,
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.035,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  cardCompact: {
    padding: 14,
    gap: 10,
  },
  cardAccent: {
    backgroundColor: "#EEF7F2",
    borderColor: "#D8ECE1",
  },
  cardSubtle: {
    shadowOpacity: 0.03,
    elevation: 1,
  },
  cardElevated: {
    borderColor: "#E5EEE9",
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    minHeight: 54,
    fontSize: theme.typography.body.md,
    textAlign: "right",
    writingDirection: "rtl",
  },
  helper: {
    fontSize: theme.typography.caption.md,
    color: theme.colors.muted,
    lineHeight: 19,
  },
  helperDanger: {
    color: theme.colors.danger,
  },
  helperSuccess: {
    color: theme.colors.primaryDark,
  },
  button: {
    backgroundColor: theme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: theme.spacing[16],
    borderRadius: 999,
    minHeight: 48,
  },
  buttonSm: {
    minHeight: 38,
    paddingVertical: 7,
    paddingHorizontal: theme.spacing[12],
  },
  buttonLg: {
    minHeight: 58,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    minHeight: 36,
    alignItems: "flex-end",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: theme.typography.body.sm,
    textAlign: "center",
    lineHeight: 20,
  },
  buttonTextSm: {
    fontSize: theme.typography.body.sm,
  },
  buttonTextSecondary: {
    color: theme.colors.text,
  },
  buttonTextGhost: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: theme.status.neutral.background,
  },
  badgeWarning: {
    backgroundColor: theme.status.warning.background,
  },
  badgeSuccess: {
    backgroundColor: theme.status.success.background,
  },
  badgeDanger: {
    backgroundColor: theme.status.danger.background,
  },
  badgeInfo: {
    backgroundColor: theme.status.info.background,
  },
  badgeText: {
    fontWeight: "800",
    fontSize: theme.typography.caption.sm,
    color: theme.status.neutral.text,
    lineHeight: 15,
  },
  badgeTextWarning: {
    color: theme.status.warning.text,
  },
  badgeTextSuccess: {
    color: theme.status.success.text,
  },
  badgeTextDanger: {
    color: theme.status.danger.text,
  },
  badgeTextInfo: {
    color: theme.status.info.text,
  },
  sectionHeader: {
    marginTop: 0,
    marginBottom: -2,
  },
  sectionHeaderRtl: {
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 22,
  },
  stateIcon: {
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
    color: theme.colors.primaryDark,
    textAlign: "center",
  },
  stateTitle: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "center",
  },
  stateMessage: {
    fontSize: theme.typography.body.sm,
    lineHeight: 21,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
