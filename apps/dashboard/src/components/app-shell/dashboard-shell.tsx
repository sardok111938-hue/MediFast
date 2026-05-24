"use client";

import type { ReactNode } from "react";
import { Badge } from "../ui/badge";
import type { NavItem } from "../../types/dashboard";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useLocale } from "@/lib/i18n/locale-context";

export function DashboardShell({
  title,
  subtitle,
  nav,
  topbar,
  children,
}: {
  title?: string;
  subtitle?: string;
  nav: readonly NavItem[];
  topbar?: ReactNode;
  children: ReactNode;
}) {
  const { locale, isRTL, t } = useLocale();
  const hasTopbar = Boolean(title || topbar);

  return (
    <div className="page" dir={isRTL ? "rtl" : "ltr"} lang={locale}>
      <div className="shell">
        <Sidebar
          title={title ? t(title) : t("MediFast")}
          subtitle={subtitle ? t(subtitle) : ""}
          nav={nav}
          topSlot={<Badge>{t("MediFast")}</Badge>}
        />

        <main className="content">
          {hasTopbar ? (
            <Topbar
              left={title ? <h2>{t(title)}</h2> : null}
              right={topbar}
            />
          ) : null}

          {children}
        </main>
      </div>
    </div>
  );
}