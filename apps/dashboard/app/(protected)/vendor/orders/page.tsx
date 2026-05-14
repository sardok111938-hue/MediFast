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
    <DashboardShell title="الطلبات" subtitle="قبول الطلبات وتجهيزها للصيدلية والتسليم." nav={dashboardNavigation.vendor}>
      <PageHeader title="الطلبات" description="راجع طلبات الصيدلية، صفّها حسب مرحلة التنفيذ، واتخذ الإجراء التالي المسموح فقط." />
      <VendorOrdersClient initialStatusFilter={resolvedSearchParams?.status} />
    </DashboardShell>
  );
}
