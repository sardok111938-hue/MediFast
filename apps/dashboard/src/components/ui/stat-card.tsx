"use client";

import { useLocale } from "../../lib/i18n/locale-context";

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  const { t, intlLocale } = useLocale();
  const numericValue = Number(value);
  const displayValue = Number.isFinite(numericValue) && value.trim() !== "" ? new Intl.NumberFormat(intlLocale).format(numericValue) : value;

  return (
    <div className="stat">
      <div className="muted">{t(label)}</div>
      <h3>{displayValue}</h3>
      <div className="muted">{t(hint)}</div>
    </div>
  );
}
