import { theme } from "@medifast/ui";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCustomerI18n } from "../../infrastructure/i18n/CustomerI18nProvider";

function BackButton({ label, href }: { label: string; href: string }) {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();

  return (
    <Pressable style={[styles.backButton, isRTL ? styles.backButtonRtl : null]} onPress={() => router.replace(href as never)}>
      <Text style={styles.backButtonText}>{isRTL ? "›" : "‹"}</Text>
      <Text style={styles.backButtonText}>{t(label)}</Text>
    </Pressable>
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
  contentContainerStyle,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  scroll?: boolean;
  backHref?: string;
  backLabel?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  const { t, isRTL } = useCustomerI18n();

  const content = (
    <View style={[styles.content, !scroll ? styles.contentFullHeight : null]}>
      <View style={styles.header}>
        {backHref || action ? (
          <View style={[styles.headerTopRow, isRTL ? styles.headerTopRowRtl : null]}>
            {backHref ? <BackButton label={backLabel} href={backHref} /> : <View style={styles.headerSpacer} />}
            {action ? <View>{action}</View> : <View style={styles.headerSpacer} />}
          </View>
        ) : null}

        {title || subtitle ? (
          <View style={styles.headerText}>
            {title ? <Text style={[styles.title, isRTL ? styles.textRight : null]}>{t(title)}</Text> : null}
            {subtitle ? <Text style={[styles.subtitle, isRTL ? styles.textRight : null]}>{t(subtitle)}</Text> : null}
          </View>
        ) : null}
      </View>

      {children}
    </View>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={[styles.nonScrollContent, contentContainerStyle]}>{content}</View>
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
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
        >
          {content}
        </ScrollView>
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
  nonScrollContent: {
    flex: 1,
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
});