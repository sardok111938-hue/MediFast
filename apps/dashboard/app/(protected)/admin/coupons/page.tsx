import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminCouponsPage() {
  return (
    <DashboardShell title="Coupons" subtitle="Promotional controls for growth campaigns." nav={dashboardNavigation.admin}>
      <PageHeader title="Coupons" description="Promotional controls for growth campaigns." />
      <Table
        title="Coupons"
        headers={["Code", "Discount", "Usage", "Status"]}
        rows={[
          ["WELCOME10", "10%", "34", "active"],
          ["CARE5", "$5", "12", "active"],
        ]}
      />
    </DashboardShell>
  );
}
