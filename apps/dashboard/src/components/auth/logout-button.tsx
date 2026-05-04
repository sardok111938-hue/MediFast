"use client";

import { signOutDashboardUser } from "../../features/auth/api";
import { useLocale } from "../../lib/i18n/locale-context";

export function LogoutButton() {
  const { t } = useLocale();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOutDashboardUser();
        window.location.href = "/login";
      }}
    >
      {t("Logout")}
    </button>
  );
}
