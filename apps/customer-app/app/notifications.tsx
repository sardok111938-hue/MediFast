import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";

import { EmptyCard, Screen } from "../src/components/CustomerUI";

export default function NotificationsScreen() {
  return (
    <Screen
      title="الإشعارات"
      subtitle="تابع تحديثات الطلبات والتنبيهات المهمة."
      backHref="/home"
      backLabel="العودة"
    >
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
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
