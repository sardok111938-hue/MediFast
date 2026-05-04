"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LoginForm } from "../../../src/components/auth/login-form";
import { useLocale } from "../../../src/lib/i18n/locale-context";
import { ROUTES } from "../../../src/lib/config/routes";
import {
  getCurrentProfileClient,
  getCurrentSessionUserClient,
} from "../../../src/features/auth/queries";

const roleRoutes: Record<string, string> = {
  admin: ROUTES.admin,
  driver: ROUTES.driver,
  vendor: ROUTES.vendor,
};

export default function LoginPage() {
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    const checkSession = async () => {
      const user = await getCurrentSessionUserClient();

      if (!user) {
        return;
      }

      const profile = await getCurrentProfileClient(user.id);
      const target = roleRoutes[profile?.role ?? ""];

      router.replace((target ?? "/") as never);
    };

    void checkSession();
  }, [router]);

  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div className="hero" style={{ maxWidth: 520 }}>
        <div className="pill">{t("MediFast Access")}</div>
        <h1>{t("Admin, vendor, and driver login")}</h1>
        <p className="muted">
          {t(
            "This form signs in with Supabase Auth, reads the profiles.role, and routes to the correct dashboard."
          )}
        </p>
        <LoginForm />
      </div>
    </div>
  );
}