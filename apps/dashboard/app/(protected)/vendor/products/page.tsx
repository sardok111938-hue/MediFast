import Link from "next/link";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorProductsClient } from "../../../../src/features/products/components/vendor-products-client";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ edit?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  return (
    <DashboardShell
      title="المنتجات"
      subtitle="إدارة الكتالوج والأسعار والصور وحالة الظهور."
      nav={dashboardNavigation.vendor}
    >
      <PageHeader
        title="المنتجات"
        description="أضف وعدّل منتجات الصيدلية، الأسعار، الصور، التصنيفات، وحالة الظهور للزبائن."
      >
        <div className="inline-actions">
          <Link href="/vendor/inventory" className="button secondary-button">
            فتح صفحة المخزون
          </Link>
        </div>
      </PageHeader>


      <VendorProductsClient initialEditingProductId={resolvedSearchParams?.edit} />
    </DashboardShell>
  );
}