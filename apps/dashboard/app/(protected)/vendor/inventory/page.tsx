import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { vendorUpdateProductStockAction } from "../../../../src/features/products/actions";
import { listVendorProducts } from "../../../../src/features/products/queries";

export default async function VendorInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const products = await listVendorProducts();
  const activeProducts = products.filter((product) => product.is_active);
  const lowStockProducts = activeProducts.filter((product) => product.stock_quantity > 0 && product.stock_quantity <= 10);
  const outOfStockProducts = activeProducts.filter((product) => product.stock_quantity <= 0);

  async function handleStockUpdate(formData: FormData) {
    "use server";

    const productId = String(formData.get("product_id") ?? "");
    const stockQuantity = Number(String(formData.get("stock_quantity") ?? ""));

    if (!productId || Number.isNaN(stockQuantity) || stockQuantity < 0) {
      redirect("/vendor/inventory?error=invalid_stock");
    }

    const result = await vendorUpdateProductStockAction({
      productId,
      stockQuantity,
    });

    if (!result.success) {
      redirect(`/vendor/inventory?error=${encodeURIComponent(result.error ?? "stock_update_failed")}`);
    }

    redirect("/vendor/inventory?success=stock_updated");
  }

  return (
    <DashboardShell title="المخزون" subtitle="متابعة المنتجات منخفضة أو نافدة المخزون." nav={dashboardNavigation.vendor}>
      <PageHeader title="المخزون" description="راجع مخاطر المخزون، حدّث الكميات الآمنة، وافتح تعديل المنتج عند الحاجة.">
        {resolvedSearchParams?.success ? <p className="success">تم تحديث المخزون بنجاح.</p> : null}
        {resolvedSearchParams?.error ? <p className="danger">{resolvedSearchParams.error}</p> : null}
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

      {activeProducts.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا يوجد مخزون بعد" message="ستظهر المنتجات النشطة هنا بعد توفر كتالوج الصيدلية." />
        </Card>
      ) : null}

      {outOfStockProducts.length > 0 ? (
        <section className="table">
          <h3>نفد المخزون</h3>
          <div className="inventory-list">
            {outOfStockProducts.map((product) => (
              <form key={product.id} action={handleStockUpdate} className="inventory-row">
                <div>
                  <strong>{product.name}</strong>
                  <p className="muted inventory-highlight-copy">هذا المنتج النشط غير متاح حاليًا لطلبات جديدة.</p>
                </div>
                <input type="hidden" name="product_id" value={product.id} />
                <div className="inventory-actions">
                  <input className="input inventory-stock-input" type="number" min="0" name="stock_quantity" defaultValue={product.stock_quantity} />
                  <button type="submit" className="button">حفظ المخزون</button>
                  <Link href={`/vendor/products?edit=${product.id}`} className="button secondary-button">
                    تعديل المنتج
                  </Link>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {lowStockProducts.length > 0 ? (
        <section className="table">
          <h3>مخزون منخفض</h3>
          <div className="inventory-list">
            {lowStockProducts.map((product) => (
              <form key={product.id} action={handleStockUpdate} className="inventory-row">
                <div>
                  <strong>{product.name}</strong>
                  <p className="muted inventory-highlight-copy">{product.stock_quantity} وحدة متبقية. يُفضّل إعادة تعبئة هذا المنتج قريبًا.</p>
                </div>
                <input type="hidden" name="product_id" value={product.id} />
                <div className="inventory-actions">
                  <input className="input inventory-stock-input" type="number" min="0" name="stock_quantity" defaultValue={product.stock_quantity} />
                  <button type="submit" className="button">حفظ المخزون</button>
                  <Link href={`/vendor/products?edit=${product.id}`} className="button secondary-button">
                    تعديل المنتج
                  </Link>
                </div>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      <section className="table">
        <h3>كل المخزون النشط</h3>
        <div className="inventory-list">
          {activeProducts.map((product) => (
            <form key={product.id} action={handleStockUpdate} className="inventory-row">
              <div>
                <strong>{product.name}</strong>
                <p className="muted inventory-highlight-copy">المخزون الحالي: {product.stock_quantity}</p>
              </div>
              <input type="hidden" name="product_id" value={product.id} />
              <div className="inventory-actions">
                <input className="input inventory-stock-input" type="number" min="0" name="stock_quantity" defaultValue={product.stock_quantity} />
                <button type="submit" className="button">حفظ المخزون</button>
                <Link href={`/vendor/products?edit=${product.id}`} className="button secondary-button">
                  تعديل المنتج
                </Link>
              </div>
            </form>
          ))}
        </div>
      </section>
    </DashboardShell>
  );
}
