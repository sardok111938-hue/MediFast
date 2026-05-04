import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { DriverOrdersClient } from "../../../../src/features/orders/components/driver-orders-client";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function DriverOrdersPage() {
  return (
    <DashboardShell title="Driver Orders" subtitle="Pickup and delivery progress for your assigned MediFast orders." nav={dashboardNavigation.driver}>
      <PageHeader
        title="Orders"
        description="Review only the deliveries assigned to you and move them from pickup to doorstep completion."
      />
      <DriverOrdersClient />
    </DashboardShell>
  );
}
