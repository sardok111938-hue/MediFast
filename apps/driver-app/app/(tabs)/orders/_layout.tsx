import { Stack } from "expo-router";

export default function DriverOrdersLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="[orderId]"
        options={{
          presentation: "card",
        }}
      />
    </Stack>
  );
}
