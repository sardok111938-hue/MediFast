import { DashboardShell } from "../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../src/components/ui/page-header";
import { DriverDashboardClient } from "../../../src/features/orders/components/driver-dashboard-client";
import { dashboardNavigation } from "../../../src/lib/config/navigation";

export default function DriverDashboardPage() {
  return (
    <DashboardShell title="لوحة السائق" subtitle="التوصيلات المسندة وتقدم المسار لسائقي ميدي فاست." nav={dashboardNavigation.driver}>
      <PageHeader
        badge="توصيلات مسندة"
        title="لوحة السائق"
        description="تابع الطلبات الجاهزة للاستلام والتوصيلات النشطة والطلبات المكتملة من مكان واحد."
      />
      <DriverDashboardClient />
    </DashboardShell>
  );
}
