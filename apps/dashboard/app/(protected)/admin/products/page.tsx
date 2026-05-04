import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminProductsClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminProductsPage() {
  return (
    <DashboardShell title="Products" subtitle="Catalog review with a practical medical merchandising lens." nav={dashboardNavigation.admin}>
      <PageHeader title="Products" description="Supabase-backed product reads for vendor, category, price, stock, and active state." />
      <AdminMedicalCallout
        title="Catalog hygiene"
        body="This view keeps product coverage simple and readable while the team verifies category fit, price data, and stock levels."
      />
      <AdminProductsClient />
    </DashboardShell>
  );
}
