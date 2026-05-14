import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { Tabs, usePathname } from "expo-router";

export default function DriverTabsLayout() {
  const pathname = usePathname();

  const isOrderDetail = /^\/\(tabs\)\/orders\/[^/]+$/.test(pathname);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primaryDark,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: {
          fontSize: theme.typography.caption.sm,
          fontWeight: "800",
        },
        tabBarStyle: {
          display: isOrderDetail ? "none" : "flex",
          minHeight: 68,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopColor: "#DCE8E1",
          backgroundColor: "#FFFFFF",
        },
      }}
    >
      <Tabs.Screen
        name="profile"
        options={{
          title: "الحساب",
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name="person-circle-outline"
              color={color}
              size={size}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="orders"
        options={{
          title: "الطلبات",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" color={color} size={size} />
          ),
        }}
      />

      <Tabs.Screen
        name="dashboard"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}