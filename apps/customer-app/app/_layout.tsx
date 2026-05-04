import { Stack } from "expo-router";
import { CustomerI18nProvider } from "../src/lib/i18n";

export default function RootLayout() {
  return (
    <CustomerI18nProvider>
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      />
    </CustomerI18nProvider>
  );
}
