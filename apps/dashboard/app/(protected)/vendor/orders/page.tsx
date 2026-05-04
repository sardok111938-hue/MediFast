import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorOrdersClient } from "../../../../src/features/orders/components/vendor-orders-client";

export default function VendorOrdersPage() {
  return (
    <DashboardShell title="Orders" subtitle="Accept, prepare, and ready pharmacy orders for pickup." nav={dashboardNavigation.vendor}>
      <PageHeader title="Orders" description="Review vendor-owned orders and keep their status moving through fulfillment." />
      <VendorOrdersClient />
    </DashboardShell>
  );
}
