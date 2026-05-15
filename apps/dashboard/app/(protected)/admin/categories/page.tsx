import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminCategoriesClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminCategoriesPage() {
  return (
    <DashboardShell
      title="الفئات"
      subtitle="تنظيم واضح لكتالوج الصيدليات."
      nav={dashboardNavigation.admin}
    >
      <AdminCategoriesClient />
    </DashboardShell>
  );
}