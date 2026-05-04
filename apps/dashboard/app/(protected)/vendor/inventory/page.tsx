import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { getInventoryTableModel, listVendorProducts } from "../../../../src/features/products/queries";

export default async function VendorInventoryPage() {
  const products = await listVendorProducts();
  const table = getInventoryTableModel(products);

  return (
    <DashboardShell title="Inventory" subtitle="Low stock and stock level management view." nav={dashboardNavigation.vendor}>
      <PageHeader title="Inventory" description="Low stock and stock level management view." />
      <Table title={table.title} headers={table.headers} rows={table.rows} />
    </DashboardShell>
  );
}
