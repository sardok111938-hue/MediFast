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
    <DashboardShell title="Products" subtitle="Manage catalog items, prices, stock, and visibility." nav={dashboardNavigation.vendor}>
      <PageHeader title="Products" description="Manage catalog items, prices, stock, images, and active visibility from one vendor-safe flow.">
        <div className="inline-actions">
          <Link href="/vendor/inventory" className="button secondary-button">
            فتح المخزون
          </Link>
        </div>
      </PageHeader>
      <VendorProductsClient initialEditingProductId={resolvedSearchParams?.edit} />
    </DashboardShell>
  );
}
