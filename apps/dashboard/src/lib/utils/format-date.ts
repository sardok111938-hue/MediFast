function resolveIntlLocale(locale?: string) {
  if (locale) {
    return locale;
  }

  if (typeof document !== "undefined") {
    return document.documentElement.lang === "ar" ? "ar-EG" : "en-US";
  }

  return "en-US";
}

export function formatDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
