export type Locale = "ar";

export const DEFAULT_LOCALE: Locale = "ar";

export function resolveLocale(_value?: string | null): Locale {
  return "ar";
}

export function isRtlLocale(_locale: Locale) {
  return true;
}

const translations = {
  ar: {
    continue: "متابعة",
  },
};

export function translateKey(_locale: Locale, key: string) {
  return translations.ar[key as keyof typeof translations.ar] ?? key;
}