import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function VendorOffersPage() {
  return (
    <DashboardShell title="Offers / Discounts" subtitle="Store-level promotions and markdowns." nav={dashboardNavigation.vendor}>
      <PageHeader title="Offers / Discounts" description="Store-level promotions and markdowns." />
      <Table
        title="Offers"
        headers={["Offer", "Discount", "Applies To", "Status"]}
        rows={[
          ["Skin care weekend", "15%", "Category", "scheduled"],
          ["Vitamin bundle", "$3 off", "Products", "active"],
        ]}
      />
    </DashboardShell>
  );
}
