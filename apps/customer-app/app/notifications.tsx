import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EmptyCard, Screen } from "../src/components/CustomerUI";
import { supabase } from "../src/lib/supabase";

type CustomerNotification = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<CustomerNotification[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    setError(null);

    const { data, error: notificationError } = await supabase
      .from("notifications")
      .select("id,title,body,created_at")
      .eq("recipient_role", "customer")
      .order("created_at", { ascending: false })
      .limit(50);

    if (notificationError) {
      setError(notificationError.message);
      setNotifications([]);
    } else {
      setNotifications((data ?? []) as CustomerNotification[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  return (
    <Screen
      title="الإشعارات"
      subtitle="تابع تحديثات الطلبات والتنبيهات المهمة."
      backHref="/home"
      backLabel="العودة"
    >
      {loading ? (
        <View style={styles.centerCard}>
          <ActivityIndicator color={theme.colors.primaryDark} />
          <Text style={styles.mutedText}>جارٍ تحميل الإشعارات...</Text>
        </View>
      ) : error ? (
        <EmptyCard
          title="تعذر تحميل الإشعارات"
          message="حدث خطأ أثناء تحميل الإشعارات. حاول مرة أخرى."
          action={
            <Pressable style={styles.retryButton} onPress={loadNotifications}>
              <Text style={styles.retryText}>إعادة المحاولة</Text>
            </Pressable>
          }
        />
      ) : notifications.length === 0 ? (
        <EmptyCard
          title="لا توجد إشعارات حالياً"
          message="ستظهر هنا تحديثات الطلبات والتنبيهات المهمة عند توفرها."
          action={
            <View style={styles.iconWrap}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={theme.colors.primaryDark}
              />
              <Text style={styles.iconText}>
                الإشعارات مفعلة لتحديثات الطلبات
              </Text>
            </View>
          }
        />
      ) : (
        <View style={styles.list}>
          {notifications.map((notification) => (
            <View key={notification.id} style={styles.notificationCard}>
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
                <Text style={styles.notificationBody}>{notification.body}</Text>
                <Text style={styles.notificationDate}>
                  {formatNotificationDate(notification.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </Screen>
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
  centerCard: {
    alignItems: "center",
    gap: theme.spacing[8],
    padding: theme.spacing[20],
  },
  mutedText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "center",
  },
  iconWrap: {
    alignItems: "center",
    gap: theme.spacing[8],
  },
  iconText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "center",
  },
  list: {
    gap: theme.spacing[12],
  },
  notificationCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    padding: theme.spacing[16],
  },
  notificationIcon: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: theme.spacing[4],
  },
  notificationContent: {
    flex: 1,
    gap: theme.spacing[8],
  },
  notificationTitle: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
  notificationBody: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    lineHeight: 20,
    textAlign: "right",
  },
  notificationDate: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "right",
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
    fontWeight: "800",
  },
});
