import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorOrdersClient } from "../../../../src/features/orders/components/vendor-orders-client";

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams?: Promise<{ status?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <DashboardShell nav={dashboardNavigation.vendor}>
      <VendorOrdersClient initialStatusFilter={resolvedSearchParams?.status} />
    </DashboardShell>
  );
}