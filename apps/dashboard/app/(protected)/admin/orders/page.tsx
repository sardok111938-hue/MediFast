import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminOrdersClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminOrdersPage() {
  return (
    <DashboardShell title="Orders" subtitle="A lightweight operations board for order review." nav={dashboardNavigation.admin}>
      <PageHeader title="Orders" description="Supabase-backed order reads for customer flow, payment state, and operational status." />
      <AdminMedicalCallout
        title="Operations order flow"
        body="Use this board for broad order review, then open the driver assignment queue for orders that have reached ready_for_pickup."
      />
      <AdminOrdersClient />
    </DashboardShell>
  );
}
