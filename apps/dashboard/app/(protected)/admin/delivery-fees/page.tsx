import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminDeliveryFeesPage() {
  return (
    <DashboardShell title="رسوم التوصيل" subtitle="إدارة رسوم المناطق أو الرسوم الثابتة." nav={dashboardNavigation.admin}>
      <PageHeader title="رسوم التوصيل" description="إدارة قواعد الرسوم حسب المنطقة أو الرسوم الثابتة." />
      <Table
        title="قواعد الرسوم"
        headers={["المنطقة", "الرسوم الأساسية", "رسوم التوصيل السريع", "الحالة"]}
        rows={[
          ["وسط المدينة", "4.00 د.ل", "6.00 د.ل", "نشطة"],
          ["منطقة الأعمال", "5.50 د.ل", "7.00 د.ل", "نشطة"],
        ]}
      />
    </DashboardShell>
  );
}
