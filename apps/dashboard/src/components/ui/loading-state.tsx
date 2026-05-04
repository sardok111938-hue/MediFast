"use client";

import { useLocale } from "../../lib/i18n/locale-context";

export function LoadingState({ message = "Loading dashboard..." }: { message?: string }) {
  const { t } = useLocale();

  return (
    <div className="empty-state">
      <div className="state-icon" aria-hidden="true">
        ...
      </div>
      <strong>{t("Loading")}</strong>
      <p className="muted">{t(message)}</p>
    </div>
  );
}
