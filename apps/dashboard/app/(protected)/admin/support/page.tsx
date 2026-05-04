import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminSupportPage() {
  return (
    <DashboardShell title="Support Tickets" subtitle="Customer, vendor, and driver issue tracking." nav={dashboardNavigation.admin}>
      <PageHeader title="Support Tickets" description="Customer, vendor, and driver issue tracking." />
      <Table
        title="Support Queue"
        headers={["Ticket", "Type", "Priority", "Status"]}
        rows={[
          ["SUP-101", "Late delivery", "High", "Open"],
          ["SUP-102", "Inventory mismatch", "Medium", "Investigating"],
        ]}
      />
    </DashboardShell>
  );
}
