import { Stack } from "expo-router";
import { CustomerI18nProvider } from "../src/infrastructure/i18n/CustomerI18nProvider";

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
