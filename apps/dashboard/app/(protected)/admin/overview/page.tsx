"use client";

import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import {
  AdminMedicalCallout,
  AdminOverviewClient,
} from "../../../../src/features/admin/components/admin-pages";
import { useLocale } from "../../../../src/lib/i18n/locale-context";

export default function AdminOverviewPage() {
  const { t } = useLocale();

  return (
    <DashboardShell
      title={t("Admin Dashboard")}
      subtitle={t("Green-room operations for the MediFast marketplace.")}
      nav={dashboardNavigation.admin}
      topbar={null}
    >
      <PageHeader
        badge={t("Live Operations")}
        title={t("Overview")}
        description={t(
          "A simple medical operations snapshot powered by Supabase browser reads."
        )}
      />

      <AdminMedicalCallout
        title={t("Clinical calm, operational clarity")}
        body={t(
          "This overview keeps the admin team close to vendors, drivers, customers, products, categories, and live order flow without introducing any write actions yet."
        )}
      />

      <AdminOverviewClient />
    </DashboardShell>
  );
}