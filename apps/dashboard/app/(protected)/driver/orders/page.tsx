import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { DriverOrdersClient } from "../../../../src/features/orders/components/driver-orders-client";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function DriverOrdersPage() {
  return (
    <DashboardShell title="طلبات السائق" subtitle="تابع الاستلام والتوصيل للطلبات المعيّنة لك." nav={dashboardNavigation.driver}>
      <PageHeader
        title="الطلبات"
        description="راجع الشحنات المعيّنة لك فقط وانقلها من الاستلام حتى اكتمال التوصيل."
      />
      <DriverOrdersClient />
    </DashboardShell>
  );
}
