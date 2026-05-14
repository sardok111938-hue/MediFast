import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminMedicalCallout, AdminProductsClient } from "../../../../src/features/admin/components/admin-pages";

export default function AdminProductsPage() {
  return (
    <DashboardShell title="المنتجات" subtitle="مراجعة الكتالوج بمنظور تشغيلي للصيدليات." nav={dashboardNavigation.admin}>
      <PageHeader title="المنتجات" description="قراءات منتجات Supabase للصيدلية والفئة والسعر والمخزون وحالة التفعيل." />
      <AdminMedicalCallout
        title="سلامة الكتالوج"
        body="يحافظ هذا العرض على وضوح تغطية المنتجات بينما يراجع الفريق ملاءمة الفئة والأسعار ومستويات المخزون."
      />
      <AdminProductsClient />
    </DashboardShell>
  );
}
