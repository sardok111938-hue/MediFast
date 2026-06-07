import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { theme } from "@medifast/ui";
import { DriverCard, DriverScreen } from "../src/components/DriverUI";
import { supabase } from "../src/lib/supabase";

type DriverNotification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function DriverNotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);

    const { data, error: notificationError } = await supabase
      .from("notifications")
      .select("id,title,body,created_at")
      .eq("recipient_role", "driver")
      .order("created_at", { ascending: false })
      .limit(50);

    if (notificationError) {
      setError(notificationError.message);
      setNotifications([]);
    } else {
      setNotifications((data ?? []) as DriverNotification[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <DriverScreen>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.primaryDark}
          />
          <Text style={styles.backText}>رجوع</Text>
        </Pressable>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>الإشعارات</Text>
          <Text style={styles.subtitle}>طلبات جاهزة وتحديثات التوصيل.</Text>
        </View>
      </View>

      {loading ? (
        <DriverCard>
          <View style={styles.centerCard}>
            <ActivityIndicator color={theme.colors.primaryDark} />
            <Text style={styles.mutedText}>جارٍ تحميل الإشعارات...</Text>
          </View>
        </DriverCard>
      ) : error ? (
        <DriverCard>
          <View style={styles.centerCard}>
            <Text style={styles.errorTitle}>تعذر تحميل الإشعارات</Text>
            <Text style={styles.mutedText}>
              حدث خطأ أثناء تحميل الإشعارات. حاول مرة أخرى.
            </Text>
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          </View>
        </DriverCard>
      ) : notifications.length === 0 ? (
        <DriverCard>
          <View style={styles.centerCard}>
            <Ionicons
              name="notifications-outline"
              size={26}
              color={theme.colors.primaryDark}
            />
            <Text style={styles.errorTitle}>لا توجد إشعارات حالياً</Text>
            <Text style={styles.mutedText}>
              ستظهر هنا الطلبات الجاهزة للاستلام وتحديثات التوصيل.
            </Text>
          </View>
        </DriverCard>
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <DriverCard key={notification.id}>
              <View style={styles.notificationRow}>
                <View style={styles.notificationIcon}>
                  <Ionicons
                    name="notifications-outline"
                    size={18}
                    color={theme.colors.primaryDark}
                  />
                </View>

                <View style={styles.notificationContent}>
                  <Text style={styles.notificationTitle}>
                    {notification.title}
                  </Text>
                  <Text style={styles.notificationBody}>
                    {notification.body}
                  </Text>
                  <Text style={styles.notificationDate}>
                    {formatNotificationDate(notification.created_at)}
                  </Text>
                </View>
              </View>
            </DriverCard>
          ))}
        </View>
      )}
    </DriverScreen>
  );
}

function formatNotificationDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ar", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

const styles = StyleSheet.create({
  header: {
    gap: theme.spacing[12],
  },
  backButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    flexDirection: "row-reverse",
    gap: theme.spacing[4],
  },
  backText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  titleBlock: {
    alignItems: "flex-end",
    gap: theme.spacing[4],
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  centerCard: {
    alignItems: "center",
    gap: theme.spacing[8],
    paddingVertical: theme.spacing[12],
  },
  mutedText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "center",
  },
  errorTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "center",
  },
  retryButton: {
    borderColor: theme.colors.primaryDark,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[8],
  },
  retryText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
  },
  list: {
    gap: theme.spacing[12],
  },
  notificationRow: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
  },
  notificationIcon: {
    paddingTop: theme.spacing[4],
  },
  notificationContent: {
    flex: 1,
    gap: theme.spacing[8],
  },
  notificationTitle: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  notificationBody: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    lineHeight: 20,
    textAlign: "right",
  },
  notificationDate: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "right",
  },
});
