import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorOrdersClient } from "../../../../src/features/orders/components/vendor-orders-client";

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <DashboardShell title="Orders" subtitle="Accept, prepare, and ready pharmacy orders for pickup." nav={dashboardNavigation.vendor}>
      <PageHeader title="Orders" description="Review vendor-owned orders, filter by fulfillment stage, and act only on the next valid step." />
      <VendorOrdersClient initialStatusFilter={resolvedSearchParams?.status} />
    </DashboardShell>
  );
}
