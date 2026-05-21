import Link from "next/link";
import { formatOrderNumber, formatPaymentStatusLabel } from "@medifast/types";
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

function formatVendorApprovalStatus(status?: string | null) {
  switch (status) {
    case "approved":
      return "معتمد";
    case "rejected":
      return "مرفوض";
    case "pending":
      return "بانتظار الاعتماد";
    default:
      return "غير محدد";
  }
}

function getVendorStatusClass(status?: string | null) {
  switch (status) {
    case "approved":
      return "pill status-delivered";
    case "rejected":
      return "pill status-rejected";
    case "pending":
      return "pill status-pending";
    default:
      return "pill";
  }
}

function getVendorInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase();
}

export default async function VendorDashboardPage() {
  const overview = await getVendorOverviewData();
  const stats = [
    { label: "طلبات اليوم", value: String(overview.orderCounts.today), hint: "طلبات وصلت منذ بداية اليوم." },
    { label: "طلبات جديدة", value: String(overview.orderCounts.placed), hint: "طلبات تحتاج قبولًا أو مراجعة سريعة." },
    { label: "قيد التحضير", value: String(overview.orderCounts.preparing), hint: "طلبات يعمل عليها فريق الصيدلية الآن." },
    { label: "جاهزة للاستلام", value: String(overview.orderCounts.readyForPickup), hint: "طلبات تنتظر الاستلام أو إسناد التوصيل." },
    { label: "تم التسليم", value: String(overview.orderCounts.delivered), hint: "طلبات مكتملة وصلت للعملاء." },
    { label: "دفع عند الاستلام", value: String(overview.orderCounts.codPending), hint: "طلبات نقدية ما زالت بانتظار التحصيل." },
  ];
  const approvalClassName = getVendorStatusClass(overview.approvalStatus);

  return (
    <DashboardShell title="لوحة المتجر" subtitle="تشغيل الطلبات والمخزون لصيدليات MediFast." nav={dashboardNavigation.vendor}>
      <PageHeader
        badge="عمليات الصيدلية"
        title="الرئيسية"
        description="نظرة عملية على جاهزية المتجر، الطلبات الحالية، وصحة الكتالوج من مكان واحد."
      />

      {!overview.hasVendor ? (
        <Card className="medical-panel">
          <EmptyState title="المتجر غير جاهز" message="هذا الحساب غير مرتبط بسجل متجر حتى الآن." />
        </Card>
      ) : (
        <Card className="medical-panel vendor-profile-card">
          <div className="vendor-profile-hero">
            <div className="vendor-profile-media">
              {overview.imageUrl ? (
                <img src={overview.imageUrl} alt={overview.vendorName} />
              ) : (
                <span>{getVendorInitials(overview.vendorName) || "MF"}</span>
              )}
            </div>
            <div className="vendor-profile-content">
              <div className="vendor-profile-status">
                <span className={approvalClassName}>{formatVendorApprovalStatus(overview.approvalStatus)}</span>
                <span className={overview.isActive ? "pill status-delivered" : "pill status-rejected"}>
                  {overview.isActive ? "نشط في الواجهة" : "غير نشط"}
                </span>
              </div>
              <h2>{overview.vendorName}</h2>
              <p>{overview.description || "أضف وصفًا قصيرًا للمتجر ليظهر بصورة أوضح لفريق التشغيل والعملاء."}</p>
              <p className="muted vendor-profile-address">{overview.address}</p>
            </div>
            <div className="vendor-profile-actions">
              <Link href="/vendor/settings" className="button">
                إعدادات المتجر
              </Link>
              <Link href="/vendor/products" className="button secondary-button">
                إضافة منتج
              </Link>
              <Link href="/vendor/products" className="button secondary-button">
                إدارة المنتجات
              </Link>
              <Link href="/vendor/orders?status=placed" className="button secondary-button">
                الطلبات الجديدة
              </Link>
            </div>
          </div>
        </Card>
      )}

      <section className="grid medical-grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="section-heading">
            <h3 className="order-card-title">ملخص التحصيل والاستلام</h3>
            <p className="muted order-card-subtitle">أهم مؤشرات التنفيذ اليومية.</p>
          </div>
          <div className="detail-meta">
  <div className="detail-block">
    <strong>تحصيل نقدي معلق</strong>
    <span>{overview.orderCounts.codPending}</span>
  </div>

  <div className="detail-block">
    <strong>تحصيل نقدي مكتمل</strong>
    <span>{overview.orderCounts.codCollected}</span>
  </div>

  <div className="detail-block">
    <strong>متوسط قيمة الطلب</strong>
    <span>{formatCurrency(overview.orderCounts.averageOrderValue, "en-GB")}</span>
  </div>

  <div className="detail-block">
    <strong>جاهزة للاستلام</strong>
    <span>{overview.orderCounts.readyForPickup}</span>
  </div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="section-heading">
            <h3 className="order-card-title">صحة الكتالوج</h3>
            <p className="muted order-card-subtitle">حالة المنتجات المتاحة للطلب.</p>
          </div>
          <div className="detail-meta">
            <div className="detail-block">
              <strong>منتجات نشطة</strong>
              <span>{overview.productCounts.active}</span>
            </div>
            <div className="detail-block">
              <strong>منتجات غير نشطة</strong>
              <span>{overview.productCounts.inactive}</span>
            </div>
            <div className="detail-block">
              <strong>نفد المخزون</strong>
              <span>{overview.productCounts.outOfStock}</span>
            </div>
            <div className="detail-block">
              <strong>مخزون منخفض</strong>
              <span>{overview.productCounts.lowStock}</span>
            </div>
            <div className="detail-block">
  <strong>القيمة التقريبية للمخزون</strong>
  <span>{formatCurrency(overview.productCounts.catalogValue, "en-GB")}</span>
</div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="split-actions vendor-action-panel">
            <div>
              <h3 className="order-card-title">إجراءات سريعة</h3>
              <p className="muted order-card-subtitle">اختصارات للمهام التي تحتاج متابعة مستمرة.</p>
            </div>
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
          </div>
        </Card>
      </section>

      <section className="detail-grid">
        <Table
          title="أحدث الطلبات"
          headers={["رقم الطلب", "العميل", "الإجمالي", "حالة الدفع", "عنوان التوصيل", "حالة الطلب"]}
          rows={overview.recentOrders.map((order) => [
            formatOrderNumber(order.id),
            order.customer_name,
            formatCurrency(order.total, "en-GB"),
            formatPaymentStatusLabel(order.payment_status, order.payment_method),
            order.address || "-",
            <OrderStatusBadge key={`${order.id}-overview-status`} status={order.order_status} />,
          ])}
          emptyMessage="لا توجد طلبات لهذا المتجر بعد."
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
            <EmptyState title="لا توجد تنبيهات مخزون" message="المنتجات النشطة لديها تغطية مخزون جيدة حاليًا." />
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
