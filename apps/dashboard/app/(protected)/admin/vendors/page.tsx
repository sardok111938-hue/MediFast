import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";
import { AdminVendorsManager } from "../../../../src/features/admin/vendors/vendors-manager";

export default function AdminVendorsPage() {
  return (
    <DashboardShell title="Vendors" subtitle="Admin-managed pharmacy partner setup, approval, and storefront control." nav={dashboardNavigation.admin}>
      <PageHeader title="Vendors" description="Search existing profiles, create vendor records safely, and manage approval or storefront activity." />
      <AdminMedicalCallout
        title="Partner management"
        body="Use this page to link approved identities to vendor records, edit storefront details, and control activation without exposing service-role credentials."
      />
      <AdminVendorsManager />
    </DashboardShell>
  );
}
