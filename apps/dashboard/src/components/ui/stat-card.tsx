"use client";

import { useLocale } from "../../lib/i18n/locale-context";

export function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  const { t, intlLocale } = useLocale();

  const numericValue = Number(value);

  const displayValue =
    Number.isFinite(numericValue) && value.trim() !== ""
      ? new Intl.NumberFormat(intlLocale).format(numericValue)
      : value;

  return (
    <div
      className="stat"
      style={{
        padding: "14px 16px",
      }}
    >
      <div
        className="muted"
        style={{
          fontSize: 13,
          marginBottom: 4,
        }}
      >
        {t(label)}
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 28,
          lineHeight: 1.1,
        }}
      >
        {displayValue}
      </h3>
    </div>
  );
}