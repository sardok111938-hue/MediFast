import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminSupportPage() {
  return (
    <DashboardShell title="تذاكر الدعم" subtitle="متابعة مشاكل الزبائن والصيدليات والسائقين." nav={dashboardNavigation.admin}>
      <PageHeader title="تذاكر الدعم" description="متابعة مشاكل الزبائن والصيدليات والسائقين." />
      <Table
        title="طابور الدعم"
        headers={["التذكرة", "النوع", "الأولوية", "الحالة"]}
        rows={[
          ["SUP-101", "تأخر التوصيل", "عالية", "مفتوحة"],
          ["SUP-102", "اختلاف في المخزون", "متوسطة", "قيد المراجعة"],
        ]}
      />
    </DashboardShell>
  );
}
