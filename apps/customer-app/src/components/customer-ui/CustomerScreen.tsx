import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { theme } from "@medifast/ui";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getCartItemCount, useCustomerCart } from "../../lib/cart-store";
import { useCustomerI18n } from "../../lib/i18n";
import type { IconName } from "./helpers";

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
    label: "الرئيسية",
    icon: "home-outline",
    href: "/home",
    matches: (pathname) => pathname === "/home" || pathname.startsWith("/categories") || pathname.startsWith("/pharmacies/"),
  },
  {
    key: "search",
    label: "البحث",
    icon: "search-outline",
    href: "/search",
    matches: (pathname) => pathname === "/search" || pathname === "/product-listing" || pathname === "/product-detail",
  },
  {
    key: "orders",
    label: "الطلبات",
    icon: "receipt-outline",
    href: "/order-history",
    matches: (pathname) => pathname === "/order-history" || pathname === "/order-tracking" || pathname.startsWith("/orders/"),
  },
  {
    key: "cart",
    label: "السلة",
    icon: "bag-handle-outline",
    href: "/cart",
    matches: (pathname) => pathname === "/cart" || pathname === "/checkout",
  },
  {
    key: "profile",
    label: "الحساب",
    icon: "person-outline",
    href: "/profile",
    matches: (pathname) => pathname === "/profile" || pathname === "/address-selection",
  },
];

function shouldShowTabBar(pathname: string) {
  return pathname !== "/" && pathname !== "/auth";
}

function BackButton({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();

  return (
    <Pressable style={[styles.backButton, isRTL ? styles.backButtonRtl : null]} onPress={() => router.replace(href as never)}>
      <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={18} color={theme.colors.primaryDark} />
      <Text style={styles.backButtonText}>{t(label)}</Text>
    </Pressable>
  );
}

function CustomerTabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();
  const cartItems = useCustomerCart();
  const cartCount = getCartItemCount(cartItems);

  return (
    <View style={styles.tabBarWrap}>
      <View style={[styles.tabBar, isRTL ? styles.tabBarRtl : null]}>
        {tabItems.map((tab) => {
          const active = tab.matches(pathname);

          return (
            <Pressable key={tab.key} style={styles.tabButton} onPress={() => router.replace(tab.href as never)}>
              <View style={[styles.tabIconWrap, active ? styles.tabIconWrapActive : null]}>
                <Ionicons
                  name={active ? (tab.icon.replace("-outline", "") as IconName) : tab.icon}
                  size={20}
                  color={active ? theme.colors.primaryDark : theme.colors.muted}
                />
                {tab.key === "cart" && cartCount > 0 ? (
                  <View style={styles.cartCountBadge}>
                    <Text style={styles.cartCountBadgeText}>{cartCount > 99 ? "99+" : String(cartCount)}</Text>
                  </View>
                ) : null}
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
  backLabel = "رجوع",
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
    <View style={[styles.content, !scroll ? styles.contentFullHeight : null]}>
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
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.nonScrollContent, withTabs ? styles.nonScrollContentWithTabs : null, contentContainerStyle]}>{content}</View>
          {withTabs ? <CustomerTabBar /> : null}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[
            styles.scrollContent,
            withTabs ? styles.scrollContentWithTabs : null,
            contentContainerStyle,
          ]}
        >
          {content}
        </ScrollView>
        {withTabs ? <CustomerTabBar /> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  contentFullHeight: {
    flex: 1,
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
    minWidth: 72,
  },
  headerText: {
    gap: theme.spacing[8],
  },
  title: {
    fontSize: theme.typography.heading.xl,
    fontWeight: "800",
    color: theme.colors.text,
    lineHeight: 44,
    paddingTop: 4,
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
    borderColor: "rgba(20, 83, 45, 0.08)",
  },
  backButtonRtl: {
    flexDirection: "row-reverse",
  },
  backButtonText: {
    color: theme.colors.primaryDark,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
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
    borderColor: "rgba(20, 83, 45, 0.08)",
    borderRadius: 28,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 10,
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tabBarRtl: {
    flexDirection: "row-reverse",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: 5,
    minHeight: 50,
    justifyContent: "center",
  },
  tabIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  tabIconWrapActive: {
    backgroundColor: theme.colors.accent,
    transform: [{ translateY: -1 }],
  },
  cartCountBadge: {
    position: "absolute",
    top: -4,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.danger,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  cartCountBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  tabLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: theme.typography.lineHeight.compact,
  },
  tabLabelActive: {
    color: theme.colors.primaryDark,
  },
});
