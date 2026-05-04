import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCustomersClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCustomersPage() {
  return (
    <DashboardShell title="Customers" subtitle="A simple patient-facing customer roster for admin review." nav={dashboardNavigation.admin}>
      <PageHeader title="Customers" description="Supabase-backed customer reads for name, phone, join date, and account presence." />
      <AdminMedicalCallout
        title="Customer visibility"
        body="This read-only table keeps customer activity approachable for support and operations without changing any customer-app behavior."
      />
      <AdminCustomersClient />
    </DashboardShell>
  );
}
