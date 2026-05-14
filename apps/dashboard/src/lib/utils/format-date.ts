function resolveIntlLocale(locale?: string) {
  if (locale) {
    return locale.startsWith("ar") ? "en-GB" : locale;
  }

  if (typeof document !== "undefined") {
    return document.documentElement.lang === "ar" ? "en-GB" : "en-US";
  }

  return "en-GB";
}

export function formatDate(value: string, locale?: string) {
  return new Intl.DateTimeFormat(resolveIntlLocale(locale), {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}
