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
    <DashboardShell title="الطلبات" subtitle="قبول أو رفض طلبات العملاء ثم تجهيزها للاستلام." nav={dashboardNavigation.vendor}>
      <PageHeader title="الطلبات" description="الطلبات الجديدة تصل مباشرة للصيدلية، ومنها تبدأ مراحل القبول والتحضير وجاهزية الاستلام." />
      <VendorOrdersClient initialStatusFilter={resolvedSearchParams?.status} />
    </DashboardShell>
  );
}
