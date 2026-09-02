import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { EmptyCard, Screen } from "../../ui";
import { markCustomerNotificationsViewed } from "./notification-read-state";
import {
  subscribeToCustomerNotifications,
  supabase,
} from "../../infrastructure/supabase";

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

  async function handleDeleteNotification(notificationId: string) {
    const { error } = await supabase.rpc("delete_customer_notification", {
      p_notification_id: notificationId,
    });

    if (error) {
      setError(error.message);
      return;
    }

    setNotifications((current) =>
      current.filter((item) => item.id !== notificationId),
    );
  }

  function confirmDeleteNotification(notificationId: string) {
    Alert.alert("حذف الإشعار؟", "سيتم حذف هذا الإشعار من هذه الشاشة.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "حذف",
        style: "destructive",
        onPress: () => void handleDeleteNotification(notificationId),
      },
    ]);
  }

  async function handleClearNotifications() {
    const { error } = await supabase.rpc("delete_customer_notifications");

    if (error) {
      setError(error.message);
      return;
    }

    setNotifications([]);
  }

  function confirmClearNotifications() {
    Alert.alert("مسح الإشعارات؟", "سيتم حذف جميع الإشعارات من هذه الشاشة.", [
      { text: "إلغاء", style: "cancel" },
      {
        text: "مسح الكل",
        style: "destructive",
        onPress: () => void handleClearNotifications(),
      },
    ]);
  }

  useEffect(() => {
    let isMounted = true;
    void markCustomerNotificationsViewed();

    async function setupNotifications() {
      const { data, error: customerError } =
        await supabase.rpc("get_customer_id");

      if (!isMounted) {
        return;
      }

      if (customerError || !data) {
        void loadNotifications();
        return;
      }

      void loadNotifications();

      const channel = subscribeToCustomerNotifications(String(data), () => {
        void loadNotifications();
      });

      return () => {
        void supabase.removeChannel(channel);
      };
    }

    const cleanupPromise = setupNotifications();

    return () => {
      isMounted = false;
      void cleanupPromise.then((cleanup) => {
        cleanup?.();
      });
    };
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
          <View style={styles.listHeader}>
            <Text style={styles.listHeaderTitle}>الإشعارات الأخيرة</Text>

            <Pressable
              style={styles.clearButton}
              onPress={confirmClearNotifications}
            >
              <Text style={styles.clearButtonText}>مسح الكل</Text>
            </Pressable>
          </View>

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
                <View style={styles.notificationHeader}>
                  <Pressable
                    style={styles.deleteButton}
                    hitSlop={10}
                    onPress={() => confirmDeleteNotification(notification.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>

                  <Text style={styles.notificationTitle}>
                    {notification.title}
                  </Text>
                </View>

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
  listHeader: {
    alignItems: "center",
    flexDirection: "row-reverse",
    justifyContent: "space-between",
  },
  listHeaderTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
  },
  clearButton: {
    borderColor: "#FCA5A5",
    borderRadius: theme.radius.md,
    borderWidth: 1,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 6,
  },
  clearButtonText: {
    color: "#DC2626",
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
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
  notificationHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: theme.spacing[8],
    justifyContent: "space-between",
  },
  notificationTitle: {
    color: theme.colors.primaryDark,
    flex: 1,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
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
