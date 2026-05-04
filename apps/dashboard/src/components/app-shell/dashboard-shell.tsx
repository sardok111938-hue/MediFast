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
  title: string;
  subtitle: string;
  nav: readonly NavItem[];
  topbar?: ReactNode;
  children: ReactNode;
}) {
  const { locale, isRTL, t } = useLocale();

  return (
    <div className="page" dir={isRTL ? "rtl" : "ltr"} lang={locale}>
      <div className="shell">
        <Sidebar
          title={t(title)}
          subtitle={t(subtitle)}
          nav={nav}
          topSlot={<Badge>{t("MediFast")}</Badge>}
        />
        <main className="content">
          <Topbar left={<h2>{t(title)}</h2>} right={topbar} />
          {children}
          </main>
      </div>
    </div>
  );
}