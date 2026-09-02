import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { useCustomerI18n } from "../../infrastructure/i18n/CustomerI18nProvider";
import { PrimaryButton } from "./CustomerButtons";
import { renderTranslatedText } from "./helpers";

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function ListCard({
  title,
  subtitle,
  badge,
  children,
  onPress,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  onPress?: () => void;
}) {
  const { t, isRTL } = useCustomerI18n();
  const content = (
    <>
      <View style={[styles.listCardHeader, isRTL ? styles.listCardHeaderRtl : null]}>
        <View style={styles.listCardText}>
          <Text style={[styles.listCardTitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(title, t)}</Text>
          {subtitle ? <Text style={[styles.listCardSubtitle, isRTL ? styles.textRight : null]}>{renderTranslatedText(subtitle, t)}</Text> : null}
        </View>
        {badge ? <View>{badge}</View> : null}
      </View>
      {children ? <View style={styles.listCardBody}>{children}</View> : null}
    </>
  );

  if (!onPress) {
    return <Card>{content}</Card>;
  }

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]} onPress={onPress}>
      {content}
    </Pressable>
  );
}

export function LoadingCard({ message }: { message: string }) {
  const { t } = useCustomerI18n();

  return (
    <Card style={styles.stateCard}>
      <Text style={styles.stateIcon}>...</Text>
      <Text style={styles.stateTitle}>{t("Loading")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
    </Card>
  );
}

export function EmptyCard({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  const { t } = useCustomerI18n();

  return (
    <Card style={styles.stateCard}>
      <Text style={styles.stateIcon}>-</Text>
      <Text style={styles.stateTitle}>{t(title)}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {action}
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
    <Card style={styles.stateCard}>
      <Text style={styles.stateIcon}>تنبيه</Text>
      <Text style={styles.stateTitle}>لم نتمكن من إكمال العملية</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {onRetry ? <PrimaryButton label={retryLabel} onPress={onRetry} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  textRight: {
    textAlign: "right",
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    padding: theme.spacing[16],
    borderWidth: 1,
    borderColor: "rgba(20, 83, 45, 0.06)",
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  listCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  listCardHeaderRtl: {
    flexDirection: "row-reverse",
  },
  listCardText: {
    flex: 1,
    gap: 6,
  },
  listCardBody: {
    gap: theme.spacing[12],
  },
  listCardTitle: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
    flexShrink: 1,
    lineHeight: theme.typography.lineHeight.body,
  },
  listCardSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
    flexShrink: 1,
  },
  stateCard: {
    alignItems: "center",
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
    lineHeight: 32,
    paddingTop: 2,
  },
  stateMessage: {
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.muted,
    textAlign: "center",
  },
});
