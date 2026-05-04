"use client";

import {
  DEFAULT_LOCALE,
  isRtlLocale,
  translateKey,
  type Locale,
} from "@medifast/i18n";
import { I18nManager } from "react-native";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

const DriverI18nContext = createContext<{
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
} | null>(null);

export function DriverI18nProvider({ children }: { children: ReactNode }) {
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

  return <DriverI18nContext.Provider value={value}>{children}</DriverI18nContext.Provider>;
}

export function useDriverI18n() {
  const context = useContext(DriverI18nContext);

  if (!context) {
    throw new Error("useDriverI18n must be used within DriverI18nProvider.");
  }

  return context;
}
