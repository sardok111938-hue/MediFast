import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";
import { AdminVendorsManager } from "../../../../src/features/admin/vendors/vendors-manager";

export default function AdminVendorsPage() {
  return (
    <DashboardShell title="الصيدليات" subtitle="إعداد شركاء الصيدليات واعتمادهم وإدارة ظهورهم." nav={dashboardNavigation.admin}>
      <PageHeader title="الصيدليات" description="ابحث في الملفات الحالية، أنشئ سجلات صيدليات بأمان، وأدر الاعتماد أو نشاط الواجهة." />
      <AdminMedicalCallout
        title="إدارة الشركاء"
        body="استخدم هذه الصفحة لربط الهويات المعتمدة بسجلات الصيدليات، وتعديل تفاصيل الواجهة، والتحكم في التفعيل دون كشف صلاحيات الخدمة."
      />
      <AdminVendorsManager />
    </DashboardShell>
  );
}
