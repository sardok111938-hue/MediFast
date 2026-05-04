import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminVendorsClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminVendorsPage() {
  return (
    <DashboardShell title="Vendors" subtitle="Pharmacy partner visibility in a clean green workspace." nav={dashboardNavigation.admin}>
      <PageHeader title="Vendors" description="Supabase-backed vendor reads for approvals, addresses, and storefront status." />
      <AdminMedicalCallout
        title="Partner readiness"
        body="Use this page to review which pharmacies are live, where they operate, and whether each storefront is open for medication order flow."
      />
      <AdminVendorsClient />
    </DashboardShell>
  );
}
