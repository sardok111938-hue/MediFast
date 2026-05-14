import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminOrdersClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminOrdersPage() {
  return (
    <DashboardShell title="الطلبات" subtitle="مراقبة الطلبات والتدخل اليدوي عند الحاجة." nav={dashboardNavigation.admin}>
      <PageHeader title="الطلبات" description="هذه اللوحة للمراقبة العامة، بينما قبول الطلبات وتحضيرها يتم من لوحة الصيدلية." />
      <AdminMedicalCallout
        title="دور الإدارة في الطلبات"
        body="الإدارة تراقب جميع الطلبات، تسند السائقين عند الحاجة، وتستخدم التصحيح اليدوي فقط كاستثناء أو لمعالجة مشكلة تشغيلية."
      />
      <AdminOrdersClient />
    </DashboardShell>
  );
}
