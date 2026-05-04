"use client";

import { useLocale } from "../../lib/i18n/locale-context";

export function EmptyState({
  title = "No data yet",
  message,
}: {
  title?: string;
  message: string;
}) {
  const { t } = useLocale();

  return (
    <div className="empty-state">
      <div className="state-icon" aria-hidden="true">
        -
      </div>
      <strong>{t(title)}</strong>
      <p className="muted">{t(message)}</p>
    </div>
  );
}
