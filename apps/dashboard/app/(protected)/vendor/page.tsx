import Link from "next/link";
import { formatPaymentStatusLabel } from "@medifast/types";
import { DashboardShell } from "../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../src/components/ui/card";
import { EmptyState } from "../../../src/components/ui/empty-state";
import { PageHeader } from "../../../src/components/ui/page-header";
import { StatCard } from "../../../src/components/ui/stat-card";
import { Table } from "../../../src/components/ui/table";
import { OrderStatusBadge } from "../../../src/features/orders/components/order-status-badge";
import { getVendorOverviewData } from "../../../src/features/vendors/overview";
import { dashboardNavigation } from "../../../src/lib/config/navigation";
import { formatCurrency } from "../../../src/lib/utils/format-currency";

export default async function VendorDashboardPage() {
  const overview = await getVendorOverviewData();
  const stats = [
    { label: "Today's Orders", value: String(overview.orderCounts.today), hint: "Orders created since the start of today." },
    { label: "New / Placed", value: String(overview.orderCounts.placed), hint: "Orders that still need an acceptance decision." },
    { label: "Preparing", value: String(overview.orderCounts.preparing), hint: "Orders currently being prepared by the pharmacy." },
    { label: "Ready for Pickup", value: String(overview.orderCounts.readyForPickup), hint: "Orders waiting for dispatch assignment or pickup." },
    { label: "Delivered", value: String(overview.orderCounts.delivered), hint: "Completed orders already delivered to customers." },
    { label: "COD Pending", value: String(overview.orderCounts.codPending), hint: "Cash-on-delivery orders still awaiting collection." },
  ];

  return (
    <DashboardShell title="Vendor Panel" subtitle="Realtime pharmacy order management for MediFast partners." nav={dashboardNavigation.vendor}>
      <PageHeader
        badge="Vendor Operations"
        title="Dashboard"
        description="Keep order fulfillment, cash collection visibility, and catalog health in one practical operations view."
      />

      {!overview.hasVendor ? (
        <Card className="medical-panel">
          <EmptyState title="Vendor not ready" message="This account is not linked to a vendor record yet." />
        </Card>
      ) : null}

      <section className="grid medical-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>COD Pending</strong>
              <span>{overview.orderCounts.codPending}</span>
            </div>
            <div className="detail-block">
              <strong>COD Collected</strong>
              <span>{overview.orderCounts.codCollected}</span>
            </div>
            <div className="detail-block">
              <strong>Ready for Pickup</strong>
              <span>{overview.orderCounts.readyForPickup}</span>
            </div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>Active Products</strong>
              <span>{overview.productCounts.active}</span>
            </div>
            <div className="detail-block">
              <strong>Inactive Products</strong>
              <span>{overview.productCounts.inactive}</span>
            </div>
            <div className="detail-block">
              <strong>Out of Stock</strong>
              <span>{overview.productCounts.outOfStock}</span>
            </div>
            <div className="detail-block">
              <strong>Low Stock</strong>
              <span>{overview.productCounts.lowStock}</span>
            </div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="inline-actions">
            <Link href="/vendor/orders?status=placed" className="button">
              مراجعة الطلبات الجديدة
            </Link>
            <Link href="/vendor/orders?status=ready_for_pickup" className="button secondary-button">
              فتح قائمة الاستلام
            </Link>
            <Link href="/vendor/products" className="button secondary-button">
              إدارة المنتجات
            </Link>
            <Link href="/vendor/inventory" className="button secondary-button">
              مراجعة المخزون
            </Link>
          </div>
        </Card>
      </section>

      <section className="detail-grid">
        <Table
          title="Recent Orders"
          headers={["Order ID", "Customer", "Total", "Payment Status", "Delivery Address", "Order Status"]}
          rows={overview.recentOrders.map((order) => [
            order.id,
            order.customer_name,
            formatCurrency(order.total, "ar-EG"),
            formatPaymentStatusLabel(order.payment_status, order.payment_method),
            order.address || "-",
            <OrderStatusBadge key={`${order.id}-overview-status`} status={order.order_status} />,
          ])}
          emptyMessage="No vendor orders have been created yet."
        />

        <Card className="medical-panel">
          <div className="split-actions">
            <div>
              <h3 className="order-card-title">تنبيهات المخزون</h3>
              <p className="muted order-card-subtitle">المنتجات التالية تحتاج إلى إعادة تعبئة قريبًا.</p>
            </div>
            <Link href="/vendor/inventory" className="button secondary-button">
              فتح المخزون
            </Link>
          </div>
          {overview.stockAlerts.length === 0 ? (
            <EmptyState title="No stock alerts" message="Active products currently have healthy stock coverage." />
          ) : (
            <div className="stack compact-stack">
              {overview.stockAlerts.map((product) => (
                <div key={product.id} className="inventory-highlight">
                  <div>
                    <strong>{product.name}</strong>
                    <p className="muted inventory-highlight-copy">
                      {product.stock_quantity <= 0 ? "نفد المخزون حاليًا." : `${product.stock_quantity} وحدة متبقية.`}
                    </p>
                  </div>
                  <Link href={`/vendor/products?edit=${product.id}`} className="button secondary-button">
                    تعديل المنتج
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </DashboardShell>
  );
}
