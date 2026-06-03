import Link from "next/link";
import type { Route } from "next";
import { redirect } from "next/navigation";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { vendorUpdateProductStockAction } from "../../../../src/features/products/actions";
import { listVendorProducts } from "../../../../src/features/products/queries";
import { getSupabaseServerClient } from "../../../../src/lib/supabase/server";

const PAGE_SIZE = 20;

type InventoryStatus = "all" | "ok" | "low" | "out";

export default async function VendorInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{
    success?: string;
    error?: string;
    q?: string;
    status?: InventoryStatus;
    page?: string;
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const query = String(resolvedSearchParams?.q ?? "").trim();
  const status = resolvedSearchParams?.status ?? "all";
  const currentPage = Math.max(Number(resolvedSearchParams?.page ?? "1"), 1);

  const productsPage = await listVendorProducts({ page: currentPage, pageSize: PAGE_SIZE });
  const products = productsPage.rows;
  const supabase = await getSupabaseServerClient();

  const { data: inventorySettings } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "inventory")
    .maybeSingle();

  const defaultLowStockThreshold =
    typeof inventorySettings?.value === "object" &&
    inventorySettings.value !== null &&
    "default_low_stock_threshold" in inventorySettings.value
      ? Number(
          (inventorySettings.value as { default_low_stock_threshold?: unknown })
            .default_low_stock_threshold ?? 5,
        )
      : 5;

  const activeProducts = products.filter((product) => product.is_active);

  const decoratedProducts = activeProducts.map((product) => {
    const threshold = product.low_stock_threshold ?? defaultLowStockThreshold;
    const isOut = product.stock_quantity <= 0;
    const isLow = product.stock_quantity > 0 && product.stock_quantity <= threshold;

    return {
      ...product,
      threshold,
      inventoryStatus: isOut ? "out" : isLow ? "low" : "ok",
    };
  });

  const lowStockProducts = decoratedProducts.filter((product) => product.inventoryStatus === "low");
  const outOfStockProducts = decoratedProducts.filter((product) => product.inventoryStatus === "out");

  const filteredProducts = decoratedProducts.filter((product) => {
    const matchesSearch = query
      ? product.name.toLowerCase().includes(query.toLowerCase())
      : true;

    const matchesStatus =
      status === "all" ? true : product.inventoryStatus === status;

    return matchesSearch && matchesStatus;
  });

  const totalPages = productsPage.pageCount;
  const safePage = productsPage.page;
  const paginatedProducts = filteredProducts;

const makeHref = (nextPage: number): Route => {
  const params = new URLSearchParams();

  if (query) params.set("q", query);
  if (status !== "all") params.set("status", status);
  params.set("page", String(nextPage));

  return `/vendor/inventory?${params.toString()}` as Route;
};

  return (
    <DashboardShell
      title="المخزون"
      subtitle="متابعة المنتجات منخفضة أو نافدة المخزون."
      nav={dashboardNavigation.vendor}
    >
      <PageHeader
        title="المخزون"
        description="صفحة مهيأة للكتالوجات الكبيرة: بحث، فلترة، عرض مضغوط، وتقسيم صفحات."
      >
        {resolvedSearchParams?.success ? (
          <p className="success">تم تحديث المخزون بنجاح.</p>
        ) : null}
        {resolvedSearchParams?.error ? (
          <p className="danger">{resolvedSearchParams.error}</p>
        ) : null}
      </PageHeader>

      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>منتجات نشطة</strong>
              <span>{activeProducts.length}</span>
            </div>
            <div className="detail-block">
              <strong>مخزون منخفض</strong>
              <span>{lowStockProducts.length}</span>
            </div>
            <div className="detail-block">
              <strong>نفد المخزون</strong>
              <span>{outOfStockProducts.length}</span>
            </div>
          </div>
        </Card>
      </section>

      <section className="table">
        <div className="section-heading-row">
          <div>
            <h3>إدارة المخزون</h3>
            <p className="muted">
              يظهر {paginatedProducts.length} من {productsPage.totalCount} منتج
            </p>
          </div>
        </div>

        <form className="filters-bar">
          <input
            className="input"
            name="q"
            defaultValue={query}
            placeholder="ابحث باسم المنتج..."
          />

          <select className="input" name="status" defaultValue={status}>
            <option value="all">كل الحالات</option>
            <option value="ok">متوفر</option>
            <option value="low">مخزون منخفض</option>
            <option value="out">نفد المخزون</option>
          </select>

          <button className="button" type="submit">
            تطبيق
          </button>

          <Link href="/vendor/inventory" className="button secondary-button">
            مسح
          </Link>
        </form>

        {activeProducts.length === 0 ? (
          <Card className="medical-panel">
            <EmptyState
              title="لا يوجد مخزون بعد"
              message="ستظهر المنتجات النشطة هنا بعد توفر كتالوج الصيدلية."
            />
          </Card>
        ) : null}

        {activeProducts.length > 0 && paginatedProducts.length === 0 ? (
          <Card className="medical-panel">
            <EmptyState
              title="لا توجد نتائج"
              message="جرّب تغيير البحث أو الفلتر."
            />
          </Card>
        ) : null}

{paginatedProducts.length > 0 ? (
  <div className="compact-inventory-table">
  <div className="inventory-clean-header">
    <span>المنتج</span>
    <span>الحالة</span>
    <span>المخزون</span>
    <span>إجراء</span>
  </div>

  {paginatedProducts.map((product) => (
    <div key={product.id} className="inventory-clean-row">
      <div>
        <strong>{product.name}</strong>
        <p className="muted">
          الحد المنخفض: {product.threshold}
        </p>
      </div>

      <span
        className={
          product.inventoryStatus === "out"
            ? "inventory-pill danger-pill"
            : product.inventoryStatus === "low"
              ? "inventory-pill warning-pill"
              : "inventory-pill success-pill"
        }
      >
        {product.inventoryStatus === "out"
          ? "نافد"
          : product.inventoryStatus === "low"
            ? "منخفض"
            : "متوفر"}
      </span>

      <span className="inventory-qty">
        {product.stock_quantity}
      </span>

      <Link
        href={`/vendor/products?edit=${product.id}` as Route}
        className="inventory-edit-link"
      >
        تعديل
      </Link>
    </div>
  ))}
</div>
) : null}

        {totalPages > 1 ? (
          <div className="pagination-row">
            <Link
              className={`button secondary-button ${safePage <= 1 ? "disabled-link" : ""}`}
              href={safePage <= 1 ? makeHref(1) : makeHref(safePage - 1)}
            >
              السابق
            </Link>

            <span className="muted">
              صفحة {safePage} من {totalPages}
            </span>

            <Link
              className={`button secondary-button ${
                safePage >= totalPages ? "disabled-link" : ""
              }`}
              href={
                safePage >= totalPages
                  ? makeHref(totalPages)
                  : makeHref(safePage + 1)
              }
            >
              التالي
            </Link>
          </div>
        ) : null}
      </section>
    </DashboardShell>
  );
}
