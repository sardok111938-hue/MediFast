import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCustomersClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCustomersPage() {
  return (
    <DashboardShell title="العملاء" subtitle="قائمة عملاء مبسطة لمراجعة الإدارة." nav={dashboardNavigation.admin}>
      <PageHeader title="العملاء" description="قراءات عملاء Supabase للاسم والهاتف وتاريخ الانضمام ووجود الحساب." />
      <AdminMedicalCallout
        title="رؤية العملاء"
        body="يحافظ هذا الجدول للقراءة فقط على سهولة متابعة نشاط العملاء للدعم والتشغيل دون تغيير سلوك تطبيق العميل."
      />
      <AdminCustomersClient />
    </DashboardShell>
  );
}
