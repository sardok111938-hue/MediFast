import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCategoriesClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCategoriesPage() {
  return (
    <DashboardShell title="الفئات" subtitle="تنظيم واضح لكتالوج الصيدليات." nav={dashboardNavigation.admin}>
      <PageHeader title="الفئات" description="قراءة فئات Supabase للحفاظ على هيكل كتالوج واضح وسهل المتابعة." />
      <AdminMedicalCallout
        title="مراجعة التصنيف"
        body="تُعرض الفئات بهيكل خفيف حتى يتمكن فريق الإدارة من مراجعة تنظيم الكتالوج قبل توسيع أدوات الإدارة."
      />
      <AdminCategoriesClient />
    </DashboardShell>
  );
}
