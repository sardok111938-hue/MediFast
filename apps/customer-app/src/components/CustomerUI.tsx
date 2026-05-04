import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { theme } from "@medifast/ui";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomerI18n } from "../lib/i18n";

type IconName = ComponentProps<typeof Ionicons>["name"];

type TabItem = {
  key: string;
  label: string;
  icon: IconName;
  href: string;
  matches: (pathname: string) => boolean;
};

const tabItems: TabItem[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    href: "/home",
    matches: (pathname) => pathname === "/home" || pathname === "/categories",
  },
  {
    key: "search",
    label: "Search",
    icon: "search-outline",
    href: "/search",
    matches: (pathname) => pathname === "/search" || pathname === "/product-listing" || pathname === "/product-detail",
  },
  {
    key: "orders",
    label: "Orders",
    icon: "receipt-outline",
    href: "/order-history",
    matches: (pathname) => pathname === "/order-history" || pathname === "/order-tracking" || pathname.startsWith("/orders/"),
  },
  {
    key: "cart",
    label: "Cart",
    icon: "bag-handle-outline",
    href: "/cart",
    matches: (pathname) => pathname === "/cart" || pathname === "/checkout",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "person-outline",
    href: "/profile",
    matches: (pathname) => pathname === "/profile" || pathname === "/address-selection",
  },
];

function renderTranslatedText(value: ReactNode, translate: (key: string) => string) {
  return typeof value === "string" ? translate(value) : value;
}

function shouldShowTabBar(pathname: string) {
  return pathname !== "/" && pathname !== "/auth";
}

function BackButton({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();

  return (
    <Pressable style={[styles.backButton, isRTL ? styles.backButtonRtl : null]} onPress={() => router.push(href as never)}>
      <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={18} color={theme.colors.primaryDark} />
      <Text style={styles.backButtonText}>{t(label)}</Text>
    </Pressable>
  );
}

function CustomerTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useCustomerI18n();

  return (
    <View style={styles.tabBarWrap}>
      <View style={styles.tabBar}>
        {tabItems.map((tab) => {
          const active = tab.matches(pathname);

          return (
            <Pressable key={tab.key} style={styles.tabButton} onPress={() => router.push(tab.href as never)}>
              <View style={[styles.tabIconWrap, active ? styles.tabIconWrapActive : null]}>
                <Ionicons
                  name={active ? (tab.icon.replace("-outline", "") as IconName) : tab.icon}
                  size={20}
                  color={active ? theme.colors.primaryDark : theme.colors.muted}
                />
              </View>
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : null]}>{t(tab.label)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Screen({
  title,
  subtitle,
  children,
  action,
  scroll = true,
  backHref,
  backLabel = "Back",
  showTabBar,
  contentContainerStyle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
  backHref?: string;
  backLabel?: string;
  showTabBar?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const pathname = usePathname();
  const { t, isRTL } = useCustomerI18n();
  const withTabs = showTabBar ?? shouldShowTabBar(pathname);
  const content = (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={[styles.headerTopRow, isRTL ? styles.headerTopRowRtl : null]}>
          {backHref ? <BackButton label={backLabel} href={backHref} /> : <View style={styles.headerSpacer} />}
          {action ? <View>{action}</View> : <View style={styles.headerSpacer} />}
        </View>
        <View style={styles.headerText}>
          <Text style={[styles.title, isRTL ? styles.textRight : null]}>{t(title)}</Text>
          {subtitle ? <Text style={[styles.subtitle, isRTL ? styles.textRight : null]}>{t(subtitle)}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <View style={styles.screen}>
          <View style={[styles.nonScrollContent, withTabs ? styles.nonScrollContentWithTabs : null, contentContainerStyle]}>{content}</View>
          {withTabs ? <CustomerTabBar /> : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.screen}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.scrollContent,
            withTabs ? styles.scrollContentWithTabs : null,
            contentContainerStyle,
          ]}
        >
          {content}
        </ScrollView>
        {withTabs ? <CustomerTabBar /> : null}
      </View>
    </SafeAreaView>
  );
}

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

export function SearchInput({
  placeholder,
  value,
  onChangeText,
  onPress,
}: {
  placeholder: string;
  value?: string;
  onChangeText?: (value: string) => void;
  onPress?: () => void;
}) {
  const { t, isRTL } = useCustomerI18n();

  if (onPress && !onChangeText) {
    return (
      <Pressable style={[styles.searchWrap, isRTL ? styles.searchWrapRtl : null]} onPress={onPress}>
        <Ionicons name="search" size={18} color={theme.colors.muted} />
        <Text style={[styles.searchButtonText, isRTL ? styles.textRight : null]}>{t(placeholder)}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.searchWrap, isRTL ? styles.searchWrapRtl : null]}>
      <Ionicons name="search" size={18} color={theme.colors.muted} />
      <TextInput
        placeholder={t(placeholder)}
        placeholderTextColor={theme.colors.muted}
        style={[styles.searchInput, isRTL ? styles.searchInputRtl : null]}
        value={value}
        onChangeText={onChangeText}
      />
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
  const { t, isRTL } = useCustomerI18n();

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={t(placeholder)}
      placeholderTextColor={theme.colors.muted}
      secureTextEntry={secureTextEntry}
      autoCapitalize="none"
      style={[styles.formInput, isRTL ? styles.formInputRtl : null]}
    />
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

export function PrimaryButton({
  label,
  onPress,
  disabled,
  variant = "primary",
  loading = false,
  icon,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  icon?: IconName;
}) {
  const { t } = useCustomerI18n();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.buttonSecondary : null,
        variant === "ghost" ? styles.buttonGhost : null,
        disabled || loading ? styles.buttonDisabled : null,
        pressed && !disabled && !loading ? styles.buttonPressed : null,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      <View style={styles.buttonContent}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={variant === "primary" ? "#FFFFFF" : variant === "ghost" ? theme.colors.primaryDark : theme.colors.text}
          />
        ) : null}
        <Text
          style={[
            styles.buttonText,
            variant === "secondary" ? styles.buttonTextSecondary : null,
            variant === "ghost" ? styles.buttonTextGhost : null,
          ]}
        >
          {t(label)}
        </Text>
      </View>
    </Pressable>
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

export function QuantityStepper({
  value,
  onIncrement,
  onDecrement,
  disableIncrement,
  disableDecrement,
}: {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disableIncrement?: boolean;
  disableDecrement?: boolean;
}) {
  return (
    <View style={styles.quantityWrap}>
      <Pressable style={[styles.quantityButton, disableIncrement ? styles.quantityButtonDisabled : null]} onPress={onIncrement} disabled={disableIncrement}>
        <Ionicons name="add" size={16} color={theme.colors.text} />
      </Pressable>
      <Text style={styles.quantityValue}>{value}</Text>
      <Pressable style={[styles.quantityButton, disableDecrement ? styles.quantityButtonDisabled : null]} onPress={onDecrement} disabled={disableDecrement}>
        <Ionicons name="remove" size={16} color={theme.colors.text} />
      </Pressable>
    </View>
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
      <Text style={styles.stateIcon}>!</Text>
      <Text style={styles.stateTitle}>{t("Something went wrong")}</Text>
      <Text style={styles.stateMessage}>{t(message)}</Text>
      {onRetry ? <PrimaryButton label={retryLabel} onPress={onRetry} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing[32],
  },
  scrollContentWithTabs: {
    paddingBottom: 132,
  },
  nonScrollContent: {
    flex: 1,
  },
  nonScrollContentWithTabs: {
    paddingBottom: 98,
  },
  content: {
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[12],
    gap: theme.spacing[16],
  },
  header: {
    gap: theme.spacing[12],
  },
  headerTopRow: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTopRowRtl: {
    flexDirection: "row-reverse",
  },
  headerSpacer: {
    width: 88,
  },
  headerText: {
    gap: theme.spacing[8],
  },
  title: {
    fontSize: theme.typography.heading.xl,
    fontWeight: "800",
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.muted,
  },
  textRight: {
    textAlign: "right",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  backButtonRtl: {
    flexDirection: "row-reverse",
  },
  backButtonText: {
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
  },
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
  },
  listCardSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
  },
  pill: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[4],
    backgroundColor: theme.colors.accent,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
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
  },
  sectionAction: {
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchWrapRtl: {
    flexDirection: "row-reverse",
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
  },
  searchInputRtl: {
    textAlign: "right",
  },
  searchButtonText: {
    flex: 1,
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
  },
  formInput: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    minHeight: 54,
    fontSize: theme.typography.body.md,
  },
  formInputRtl: {
    textAlign: "right",
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
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[16],
    paddingHorizontal: theme.spacing[20],
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  buttonSecondary: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  buttonGhost: {
    backgroundColor: "transparent",
    minHeight: 40,
    paddingHorizontal: 0,
    alignItems: "flex-start",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonPressed: {
    opacity: 0.94,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[8],
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
  },
  buttonTextSecondary: {
    color: theme.colors.text,
  },
  buttonTextGhost: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
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
  },
  detailValueRtl: {
    textAlign: "right",
  },
  detailNodeWrap: {
    flex: 1.3,
    alignItems: "flex-end",
  },
  quantityWrap: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: theme.colors.background,
    borderRadius: 999,
    padding: 4,
    gap: theme.spacing[8],
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  quantityButtonDisabled: {
    opacity: 0.45,
  },
  quantityValue: {
    minWidth: 28,
    textAlign: "center",
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
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
  },
  stateMessage: {
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    color: theme.colors.muted,
    textAlign: "center",
  },
  tabBarWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing[16],
    paddingBottom: theme.spacing[12],
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.98)",
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 28,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 10,
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: 6,
  },
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  tabIconWrapActive: {
    backgroundColor: theme.colors.accent,
  },
  tabLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
  },
  tabLabelActive: {
    color: theme.colors.primaryDark,
  },
});
