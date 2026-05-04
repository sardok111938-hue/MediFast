import { Stack } from "expo-router";
import { DriverI18nProvider } from "../src/lib/i18n";

export default function RootLayout() {
  return (
    <DriverI18nProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </DriverI18nProvider>
  );
}
