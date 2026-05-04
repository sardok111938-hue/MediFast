import { DashboardShell } from "../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../src/components/ui/page-header";
import { DriverDashboardClient } from "../../../src/features/orders/components/driver-dashboard-client";
import { dashboardNavigation } from "../../../src/lib/config/navigation";

export default function DriverDashboardPage() {
  return (
    <DashboardShell title="Driver Panel" subtitle="Assigned deliveries and route progress for MediFast drivers." nav={dashboardNavigation.driver}>
      <PageHeader
        badge="Assigned Deliveries"
        title="Dashboard"
        description="Track pickup-ready orders, active deliveries, and completed drop-offs from one place."
      />
      <DriverDashboardClient />
    </DashboardShell>
  );
}
