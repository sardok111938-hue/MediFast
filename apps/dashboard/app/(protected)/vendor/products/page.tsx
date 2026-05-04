import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorProductsClient } from "../../../../src/features/products/components/vendor-products-client";

export default function VendorProductsPage() {
  return (
    <DashboardShell title="Products" subtitle="Manage catalog items, prices, stock, and visibility." nav={dashboardNavigation.vendor}>
      <PageHeader title="Products" description="Manage catalog items, prices, stock, and visibility." />
      <VendorProductsClient />
    </DashboardShell>
  );
}