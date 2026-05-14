import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminCouponsPage() {
  return (
    <DashboardShell title="القسائم" subtitle="ضوابط العروض لحملات النمو." nav={dashboardNavigation.admin}>
      <PageHeader title="القسائم" description="إدارة القسائم والعروض الترويجية." />
      <Table
        title="القسائم"
        headers={["الرمز", "الخصم", "الاستخدام", "الحالة"]}
        rows={[
          ["WELCOME10", "10%", "34", "نشطة"],
          ["CARE5", "5.00 د.ل", "12", "نشطة"],
        ]}
      />
    </DashboardShell>
  );
}
