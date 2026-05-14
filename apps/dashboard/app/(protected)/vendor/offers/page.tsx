import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function VendorOffersPage() {
  return (
    <DashboardShell title="العروض والخصومات" subtitle="عروض الصيدلية وتخفيضات المنتجات." nav={dashboardNavigation.vendor}>
      <PageHeader title="العروض والخصومات" description="إدارة عروض الصيدلية والتخفيضات المخصصة للكتالوج." />
      <Table
        title="العروض"
        headers={["العرض", "الخصم", "ينطبق على", "الحالة"]}
        rows={[
          ["نهاية أسبوع العناية بالبشرة", "15%", "فئة", "مجدول"],
          ["باقة الفيتامينات", "3.00 د.ل خصم", "منتجات", "نشط"],
        ]}
      />
    </DashboardShell>
  );
}
