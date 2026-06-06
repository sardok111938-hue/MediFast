import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCustomersClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCustomersPage() {
  return (
    <DashboardShell title="الزبائن" subtitle="قائمة زبائن مبسطة لمراجعة الإدارة." nav={dashboardNavigation.admin}>
      <PageHeader title="الزبائن" description="قراءات زبائن Supabase للاسم والهاتف وتاريخ الانضمام ووجود الحساب." />
      <AdminMedicalCallout
        title="رؤية الزبائن"
        body="يحافظ هذا الجدول للقراءة فقط على سهولة متابعة نشاط الزبائن للدعم والتشغيل دون تغيير سلوك تطبيق الزبون."
      />
      <AdminCustomersClient />
    </DashboardShell>
  );
}
