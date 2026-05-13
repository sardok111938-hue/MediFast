import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDriverI18n } from "../lib/i18n";

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
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.header, isRTL ? styles.headerRtl : null]}>
      <View style={styles.headerText}>
        <Text style={[styles.title, isRTL ? styles.textRight : null]} numberOfLines={2}>
          {t(title)}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
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
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
}) {
  const content = (
    <View style={styles.content}>
      <DriverTopBar title={title} subtitle={subtitle} action={action} />
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

export function DriverListCard({
  title,
  subtitle,
  meta,
  badge,
  children,
  action,
  footer,
  compact = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  meta?: ReactNode;
  badge?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <DriverCard variant="elevated" compact={compact}>
      <View style={[styles.listCardHeader, isRTL ? styles.listCardHeaderRtl : null]}>
        <View style={styles.listCardText}>
          <Text style={[styles.listCardTitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
            {renderTranslatedText(title, t)}
          </Text>

          {subtitle ? (
            <Text style={[styles.listCardSubtitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
              {renderTranslatedText(subtitle, t)}
            </Text>
          ) : null}

          {meta ? <View style={[styles.cardMeta, isRTL ? styles.cardMetaRtl : null]}>{meta}</View> : null}
        </View>

        {badge ? <View style={styles.badgeSlot}>{badge}</View> : null}
      </View>

      {children ? <View style={styles.listCardBody}>{children}</View> : null}

      {action ? <View style={styles.cardAction}>{action}</View> : null}

      {footer ? <View style={[styles.cardFooter, isRTL ? styles.cardFooterRtl : null]}>{footer}</View> : null}
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

export function DriverStatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return <DriverMetricTile label={label} value={value} hint={hint} />;
}

export function DriverMetricTile({ label, value, hint }: { label: string; value: string; hint: string }) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={styles.statCard}>
      <Text style={[styles.statLabel, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {t(label)}
      </Text>
      <Text style={[styles.statValue, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statHint, isRTL ? styles.textRight : null]} numberOfLines={2}>
        {t(hint)}
      </Text>
    </View>
  );
}

export function DriverSummaryGrid({ children }: { children: ReactNode }) {
  return <View style={styles.summaryGrid}>{children}</View>;
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

export function DriverMetaPill({ children }: { children: ReactNode }) {
  const { t } = useDriverI18n();

  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText} numberOfLines={1}>
        {renderTranslatedText(children, t)}
      </Text>
    </View>
  );
}

export function DriverInfoPill({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View
      style={[
        styles.infoPill,
        tone === "success" ? styles.infoPillSuccess : null,
        tone === "warning" ? styles.infoPillWarning : null,
        tone === "info" ? styles.infoPillInfo : null,
        isRTL ? styles.infoPillRtl : null,
      ]}
    >
      <Text style={[styles.infoPillLabel, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {t(label)}
      </Text>
      <Text style={[styles.infoPillValue, isRTL ? styles.textRight : null]} numberOfLines={1}>
        {renderTranslatedText(value, t)}
      </Text>
    </View>
  );
}

export function DriverMetricBadge({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: ReactNode;
  tone?: "neutral" | "success" | "warning" | "info";
}) {
  return <DriverInfoPill label={label} value={value} tone={tone} />;
}

export function DriverQuickAction({
  label,
  onPress,
  disabled,
  tone = "neutral",
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary";
}) {
  const { t } = useDriverI18n();

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      style={[styles.quickAction, tone === "primary" ? styles.quickActionPrimary : null, disabled ? styles.quickActionDisabled : null]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.quickActionText, tone === "primary" ? styles.quickActionTextPrimary : null]} numberOfLines={1}>
        {t(label)}
      </Text>
    </TouchableOpacity>
  );
}

export function DriverUtilityRow({ children }: { children: ReactNode }) {
  const { isRTL } = useDriverI18n();

  return <View style={[styles.utilityRow, isRTL ? styles.utilityRowRtl : null]}>{children}</View>;
}

export function DriverNoteCard({ title, children }: { title: string; children: ReactNode }) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={styles.noteCard}>
      <Text style={[styles.noteTitle, isRTL ? styles.textRight : null]}>{t(title)}</Text>
      <Text style={[styles.noteBody, isRTL ? styles.textRight : null]}>{renderTranslatedText(children, t)}</Text>
    </View>
  );
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
      <Text style={[styles.rowValue, valueTone === "muted" ? styles.rowValueMuted : null, isRTL ? styles.textRight : null]}>
        {renderTranslatedText(value, t)}
      </Text>
    </View>
  );
}

export function DriverRouteBlock({
  pickup,
  dropoff,
  compact = false,
}: {
  pickup: string;
  dropoff: string;
  compact?: boolean;
}) {
  const { t, isRTL } = useDriverI18n();

  return (
    <View style={[styles.routeBlock, compact ? styles.routeBlockCompact : null]}>
      <View style={[styles.routeRow, isRTL ? styles.routeRowRtl : null]}>
        <View style={styles.routeMarkerWrap}>
          <View style={styles.routeDot} />
          <View style={styles.routeLine} />
        </View>

        <View style={styles.routeText}>
          <Text style={[styles.routeLabel, isRTL ? styles.textRight : null]}>{t("Pickup")}</Text>
          <Text style={[styles.routeValue, isRTL ? styles.textRight : null]} numberOfLines={compact ? 1 : 2}>
            {pickup}
          </Text>
        </View>
      </View>

      <View style={[styles.routeRow, isRTL ? styles.routeRowRtl : null]}>
        <View style={styles.routeMarkerWrap}>
          <View style={[styles.routeDot, styles.routeDotDropoff]} />
        </View>

        <View style={styles.routeText}>
          <Text style={[styles.routeLabel, isRTL ? styles.textRight : null]}>{t("Dropoff")}</Text>
          <Text style={[styles.routeValue, isRTL ? styles.textRight : null]} numberOfLines={compact ? 1 : 2}>
            {dropoff}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function DriverRoutePreview(props: { pickup: string; dropoff: string; compact?: boolean }) {
  return <DriverRouteBlock {...props} />;
}

export function DriverActionBar({ children }: { children: ReactNode }) {
  const { isRTL } = useDriverI18n();

  return <View style={[styles.actionBar, isRTL ? styles.actionBarRtl : null]}>{children}</View>;
}

export function DriverOrderCard({
  vendorName,
  customerName,
  orderRef,
  statusLabel,
  statusTone = "neutral",
  pickupAddress,
  dropoffAddress,
  action,
  utilities,
  footer,
  compact = true,
}: {
  vendorName: string;
  customerName: string;
  orderRef: string;
  statusLabel: string;
  statusTone?: "neutral" | "warning" | "success" | "danger" | "info";
  pickupAddress: string;
  dropoffAddress: string;
  action?: ReactNode;
  utilities?: ReactNode;
  footer?: ReactNode;
  compact?: boolean;
}) {
  return (
    <DriverListCard
      title={vendorName}
      subtitle={customerName}
      meta={<DriverMetaPill>{orderRef}</DriverMetaPill>}
      badge={<DriverBadge label={statusLabel} tone={statusTone} />}
      action={action}
      footer={footer}
      compact={compact}
    >
      <DriverRoutePreview pickup={pickupAddress} dropoff={dropoffAddress} compact={compact} />
      {utilities ? <View style={styles.cardUtilities}>{utilities}</View> : null}
    </DriverListCard>
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
    backgroundColor: "#F6FAF7",
  },
  screen: {
    flex: 1,
    backgroundColor: "#F6FAF7",
  },
  scrollContent: {
    paddingBottom: theme.spacing[32],
  },
  content: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[12],
    paddingBottom: theme.spacing[24],
    gap: theme.spacing[16],
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
  subtitle: {
    color: theme.colors.muted,
    lineHeight: 20,
    fontSize: theme.typography.body.sm,
  },
  textRight: {
    textAlign: "right",
  },

  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    borderColor: theme.colors.border,
    borderWidth: 1,
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardCompact: {
    padding: theme.spacing[16],
    gap: theme.spacing[12],
  },
  cardAccent: {
    backgroundColor: "#EFFAF4",
    borderColor: "#CFEBDD",
  },
  cardSubtle: {
    shadowOpacity: 0.03,
    elevation: 1,
  },
  cardElevated: {
    borderColor: "#E5EEE9",
  },

  listCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  listCardHeaderRtl: {
    flexDirection: "row-reverse",
  },
  listCardText: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[4],
  },
  listCardTitle: {
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 24,
  },
  listCardSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
    fontWeight: "600",
  },
  badgeSlot: {
    flexShrink: 0,
    maxWidth: 128,
    alignItems: "flex-end",
  },
  cardMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    paddingTop: theme.spacing[4],
  },
  cardMetaRtl: {
    flexDirection: "row-reverse",
  },
  listCardBody: {
    gap: theme.spacing[12],
  },
  cardUtilities: {
    marginTop: -theme.spacing[4],
  },
  cardAction: {
    paddingTop: theme.spacing[4],
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#EDF2EF",
    paddingTop: theme.spacing[8],
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    alignItems: "center",
  },
  cardFooterRtl: {
    flexDirection: "row-reverse",
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
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[20],
    borderRadius: 999,
    minHeight: 52,
  },
  buttonSm: {
    minHeight: 42,
    paddingVertical: theme.spacing[8],
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
    fontSize: theme.typography.body.md,
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

  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    minWidth: 142,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing[16],
    borderColor: "#E5EEE9",
    borderWidth: 1,
    gap: theme.spacing[8],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  statLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
  },
  statValue: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    lineHeight: 30,
  },
  statHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    lineHeight: 18,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },

  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[8],
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
    marginTop: theme.spacing[8],
    marginBottom: -theme.spacing[4],
  },
  sectionHeaderRtl: {
    alignItems: "flex-end",
  },
  sectionTitle: {
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 24,
  },

  metaPill: {
    backgroundColor: "#F4F8F6",
    borderRadius: 999,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[4],
    maxWidth: "100%",
  },
  metaPillText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 16,
  },
  infoPill: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 96,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: "#E5EEE9",
    backgroundColor: "#F8FBF9",
    paddingHorizontal: theme.spacing[8],
    paddingVertical: theme.spacing[8],
    gap: 2,
  },
  infoPillRtl: {
    alignItems: "flex-end",
  },
  infoPillSuccess: {
    backgroundColor: "#EFFAF4",
    borderColor: "#CFEBDD",
  },
  infoPillWarning: {
    backgroundColor: "#FFF7E8",
    borderColor: "#F3D9A7",
  },
  infoPillInfo: {
    backgroundColor: "#EEF7FF",
    borderColor: "#CFE5F6",
  },
  infoPillLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    lineHeight: 15,
  },
  infoPillValue: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 17,
  },
  utilityRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    alignItems: "center",
  },
  utilityRowRtl: {
    flexDirection: "row-reverse",
  },
  quickAction: {
    minHeight: 40,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#DCE8E1",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    flexBasis: "30%",
  },
  quickActionPrimary: {
    backgroundColor: "#EFFAF4",
    borderColor: "#BFE5D1",
  },
  quickActionDisabled: {
    opacity: 0.45,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 17,
  },
  quickActionTextPrimary: {
    color: theme.colors.primaryDark,
  },
  noteCard: {
    backgroundColor: "#F8FBF9",
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "#E5EEE9",
    padding: theme.spacing[12],
    gap: theme.spacing[4],
  },
  noteTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "800",
    lineHeight: 20,
  },
  noteBody: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    lineHeight: 21,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
    paddingVertical: theme.spacing[4],
  },
  rowRtl: {
    flexDirection: "row-reverse",
  },
  rowLabel: {
    color: theme.colors.muted,
    fontWeight: "800",
    flex: 0.9,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
  },
  rowValue: {
    color: theme.colors.text,
    flex: 1.5,
    textAlign: "right",
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
    minWidth: 0,
    fontWeight: "600",
  },
  rowValueMuted: {
    color: theme.colors.muted,
  },

  routeBlock: {
    backgroundColor: "#F8FBF9",
    borderRadius: theme.radius.lg,
    padding: theme.spacing[12],
    gap: theme.spacing[8],
    borderWidth: 1,
    borderColor: "#EDF2EF",
  },
  routeBlockCompact: {
    padding: theme.spacing[12],
    gap: theme.spacing[8],
  },
  routeRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  routeRowRtl: {
    flexDirection: "row-reverse",
  },
  routeMarkerWrap: {
    width: 16,
    alignItems: "center",
    paddingTop: theme.spacing[4],
  },
  routeDot: {
    width: 11,
    height: 11,
    borderRadius: 999,
    backgroundColor: theme.colors.primaryDark,
  },
  routeDotDropoff: {
    backgroundColor: theme.colors.info,
  },
  routeLine: {
    width: 2,
    height: 22,
    backgroundColor: "#DDE8E2",
    marginTop: 4,
    borderRadius: 999,
  },
  routeText: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  routeLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    lineHeight: 15,
  },
  routeValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
    fontWeight: "600",
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
  actionBar: {
    flexDirection: "row",
    gap: theme.spacing[8],
    alignItems: "center",
  },
  actionBarRtl: {
    flexDirection: "row-reverse",
  },
});
