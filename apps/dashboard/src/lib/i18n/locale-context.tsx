"use client";

import {
  DEFAULT_LOCALE,
  getIntlLocale,
  isRtlLocale,
  translateKey,
  type Locale,
} from "./index";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

const LocaleContext = createContext<{
  locale: Locale;
  intlLocale: string;
  isRTL: boolean;
  t: (key: string) => string;
} | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const locale = DEFAULT_LOCALE;

  useEffect(() => {
    document.documentElement.lang = "ar";
    document.documentElement.dir = "rtl";
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      intlLocale: getIntlLocale(locale),
      isRTL: isRtlLocale(locale),
      t: (key: string) => translateKey(locale, key),
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider.");
  }

  return context;
}
