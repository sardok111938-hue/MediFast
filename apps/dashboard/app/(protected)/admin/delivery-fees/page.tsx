import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminDeliveryFeesPage() {
  return (
    <DashboardShell title="Delivery Fees" subtitle="Manage zone-based or flat fee rules." nav={dashboardNavigation.admin}>
      <PageHeader title="Delivery Fees" description="Manage zone-based or flat fee rules." />
      <Table
        title="Fee Rules"
        headers={["Zone", "Base Fee", "Express Fee", "Status"]}
        rows={[
          ["Central District", "$4.00", "$6.00", "active"],
          ["Business Park", "$5.50", "$7.00", "active"],
        ]}
      />
    </DashboardShell>
  );
}
