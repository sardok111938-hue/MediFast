"use client";

import { Button } from "./button";
import { useLocale } from "../../lib/i18n/locale-context";

export function ErrorState({
  message,
  retryLabel = "Retry",
  onRetry,
}: {
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { t } = useLocale();

  return (
    <div className="empty-state">
      <div className="state-icon" aria-hidden="true">
        !
      </div>
      <strong>{t("Something went wrong")}</strong>
      <p className="muted">{t(message)}</p>
      {onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : null}
    </div>
  );
}
