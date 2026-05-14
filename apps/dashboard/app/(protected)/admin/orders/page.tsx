import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminOrdersClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminOrdersPage() {
  return (
    <DashboardShell title="الطلبات" subtitle="لوحة تشغيل خفيفة لمراجعة الطلبات." nav={dashboardNavigation.admin}>
      <PageHeader title="الطلبات" description="قراءات طلبات Supabase لمسار العميل وحالة الدفع والتشغيل." />
      <AdminMedicalCallout
        title="مسار تشغيل الطلبات"
        body="استخدم هذه اللوحة للمراجعة العامة، ثم افتح طابور إسناد السائقين للطلبات التي وصلت إلى جاهزة للاستلام."
      />
      <AdminOrdersClient />
    </DashboardShell>
  );
}
