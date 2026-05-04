import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCategoriesClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCategoriesPage() {
  return (
    <DashboardShell title="Categories" subtitle="Clean catalog grouping for a green medical storefront." nav={dashboardNavigation.admin}>
      <PageHeader title="Categories" description="Supabase-backed category reads to keep the product taxonomy simple and easy to monitor." />
      <AdminMedicalCallout
        title="Taxonomy check"
        body="Categories are presented as a lightweight read-only list so the admin team can verify catalog structure before adding deeper management flows."
      />
      <AdminCategoriesClient />
    </DashboardShell>
  );
}
