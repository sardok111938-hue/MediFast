function resolveIntlLocale(locale?: string) {
  if (locale) {
    return locale;
  }

  if (typeof document !== "undefined") {
    return document.documentElement.lang === "ar" ? "ar-EG" : "en-US";
  }

  return "en-US";
}

export function formatCurrency(value: number, locale?: string, currency = "USD") {
  return new Intl.NumberFormat(resolveIntlLocale(locale), {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}
