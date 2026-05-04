"use client";

import { DEFAULT_LOCALE, isRtlLocale, translateKey, type Locale } from "./i18n-core";
import { I18nManager } from "react-native";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

const CustomerI18nContext = createContext<{
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
} | null>(null);

export function CustomerI18nProvider({ children }: { children: ReactNode }) {
  const locale = DEFAULT_LOCALE;

  useEffect(() => {
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(true);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      isRTL: isRtlLocale(locale),
      t: (key: string) => translateKey(locale, key),
    }),
    [locale]
  );

  return <CustomerI18nContext.Provider value={value}>{children}</CustomerI18nContext.Provider>;
}

export function useCustomerI18n() {
  const context = useContext(CustomerI18nContext);

  if (!context) {
    throw new Error("useCustomerI18n must be used within CustomerI18nProvider.");
  }

  return context;
}
