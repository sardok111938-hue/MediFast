import { formatCurrencyLYD } from "@medifast/types";

export function formatCurrency(value: number | string | null | undefined, locale?: string, currency?: string) {
  void locale;
  void currency;
  return formatCurrencyLYD(value);
}
