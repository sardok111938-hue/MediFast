import { redirect } from "next/navigation";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { Card } from "../../../../src/components/ui/card";
import { OrderStatusBadge } from "../../../../src/features/orders/components/order-status-badge";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { listAvailableApprovedDrivers } from "../../../../src/features/drivers/queries";
import { listAdminOrderDetails } from "../../../../src/features/orders/queries";
import { formatCurrency } from "../../../../src/lib/utils/format-currency";
import { formatDate } from "../../../../src/lib/utils/format-date";
import { AssignmentSubmitButton } from "../../../../src/features/admin/components/assignment-submit-button";
import { assignDriverAction } from "../../../../src/features/orders/actions";

const assignmentFilters = ["ready_for_pickup", "assigned", "on_the_way", "delivered"] as const;

type AssignmentFilter = (typeof assignmentFilters)[number];

function resolveFilter(value: string | undefined): AssignmentFilter {
  if (value && assignmentFilters.includes(value as AssignmentFilter)) {
    return value as AssignmentFilter;
  }

  return "ready_for_pickup";
}

function formatAddress(order: Awaited<ReturnType<typeof listAdminOrderDetails>>[number]) {
  return [order.address_label, order.address_line_1, order.address_line_2, order.area, order.city].filter(Boolean).join("، ");
}

function filterHref(filter: AssignmentFilter) {
  return `/admin/assignments?filter=${filter}`;
}

export default async function AdminAssignmentsPage({
  searchParams,
}: {
  searchParams?: Promise<{ success?: string; error?: string; filter?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const currentFilter = resolveFilter(resolvedSearchParams?.filter);
  const [drivers, orders] = await Promise.all([listAvailableApprovedDrivers(), listAdminOrderDetails()]);

  async function handleAssignDriver(formData: FormData) {
    "use server";

    const orderId = String(formData.get("order_id") ?? "");
    const driverId = String(formData.get("driver_id") ?? "");
    const activeFilter = resolveFilter(String(formData.get("active_filter") ?? currentFilter));

    if (!orderId || !driverId) {
      redirect(`/admin/assignments?filter=${activeFilter}&error=missing+assignment+data`);
    }

    const order = orders.find((candidate) => candidate.id === orderId);
    if (!order || order.order_status !== "ready_for_pickup") {
      redirect(`/admin/assignments?filter=${activeFilter}&error=${encodeURIComponent("لا يمكن إسناد إلا الطلبات الجاهزة للاستلام.")}`);
    }

    const result = await assignDriverAction({ orderId, driverId });

    if (!result.success) {
      redirect(`/admin/assignments?filter=${activeFilter}&error=${encodeURIComponent(result.error ?? "تعذر إسناد السائق.")}`);
    }

    redirect(`/admin/assignments?filter=${activeFilter}&success=driver_assigned`);
  }

  const filteredOrders = orders.filter((order) => order.order_status === currentFilter);
  const blockedStatuses = new Set(["delivered", "rejected", "cancelled"]);
  const counts = assignmentFilters.map((filter) => ({
    filter,
    count: orders.filter((order) => order.order_status === filter).length,
  }));

  return (
    <DashboardShell title="إسناد السائقين" subtitle="إسناد السائقين المعتمدين عند جاهزية طلبات الصيدليات للاستلام." nav={dashboardNavigation.admin}>
      <PageHeader title="إسناد السائقين" description="راجع الطلبات الجاهزة للإرسال، صفّ طابور التوصيل، وأسند السائقين المتاحين بوضوح تشغيلي.">
        {resolvedSearchParams?.success ? <p className="success">تم إسناد السائق بنجاح.</p> : null}
        {resolvedSearchParams?.error ? <p className="danger">{resolvedSearchParams.error}</p> : null}
        <p className="muted">
          العرض الافتراضي يُظهر فقط طلبات <strong>جاهزة للاستلام</strong> حتى يركز فريق التشغيل على ما يحتاج إجراءً الآن.
        </p>
      </PageHeader>

      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="split-actions assignment-summary">
            <div>
              <strong>مرشحات الإسناد</strong>
              <p className="muted assignment-summary-text">استخدم هذه المرشحات للتنقل بين الطلبات الجاهزة للاستلام والتوصيلات النشطة والمكتملة.</p>
            </div>
            <div className="filter-chip-row">
              {counts.map(({ filter, count }) => (
                <a
                  key={filter}
                  href={filterHref(filter)}
                  className={`filter-chip ${currentFilter === filter ? "filter-chip-active" : ""}`.trim()}
                >
                  <span>{filter === "ready_for_pickup" ? "جاهزة للاستلام" : filter === "assigned" ? "مسندة" : filter === "on_the_way" ? "في الطريق" : "مكتملة"}</span>
                  <strong>{count}</strong>
                </a>
              ))}
            </div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>السائقون المتاحون</strong>
              <span>{drivers.length}</span>
            </div>
            <div className="detail-block">
              <strong>المرحلة الحالية</strong>
              <span>{currentFilter === "ready_for_pickup" ? "جاهزة للاستلام" : currentFilter === "assigned" ? "مسندة" : currentFilter === "on_the_way" ? "في الطريق" : "مكتملة"}</span>
            </div>
            <div className="detail-block">
              <strong>طلبات معروضة</strong>
              <span>{filteredOrders.length}</span>
            </div>
          </div>
        </Card>
      </section>

      {filteredOrders.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState
            title="لا توجد طلبات في هذه المرحلة"
            message={currentFilter === "ready_for_pickup" ? "لا توجد طلبات معتمدة من الصيدليات تنتظر سائقًا الآن." : "لا توجد طلبات تطابق مرحلة التوصيل المحددة."}
          />
        </Card>
      ) : (
        <Table
          title="طابور الإسناد"
          headers={["الطلب", "العميل", "الصيدلية", "عنوان التوصيل", "الإجمالي", "تاريخ الإنشاء", "حالة الطلب", "إجراء السائق"]}
          emptyMessage="لا توجد طلبات تنتظر إسناد سائق حاليًا."
          rows={filteredOrders.map((order) => {
            const assignable = order.order_status === "ready_for_pickup" && !blockedStatuses.has(order.order_status);
            const address = formatAddress(order);

            return [
              order.id,
              order.customer_name,
              order.vendor_name,
              address || "-",
              formatCurrency(order.total, "en-GB"),
              order.created_at ? formatDate(order.created_at, "en-GB") : "-",
              <OrderStatusBadge key={`${order.id}-status`} status={order.order_status} />,
              assignable ? (
                <form key={`${order.id}-assign`} action={handleAssignDriver} className="assignment-form">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="active_filter" value={currentFilter} />
                  <select name="driver_id" className="input" defaultValue="" disabled={drivers.length === 0}>
                    <option value="" disabled>
                      اختر السائق
                    </option>
                    {drivers.map((driver) => (
                      <option key={driver.id} value={driver.id}>
                        {driver.full_name}
                      </option>
                    ))}
                  </select>
                  <AssignmentSubmitButton disabled={drivers.length === 0} />
                </form>
              ) : (
                <div className="assignment-readonly">
                  <strong>{order.driver_name}</strong>
                  <span className="muted">
                    {order.order_status === "assigned"
                      ? "تم إسناد السائق وينتظر بدء التوصيل."
                      : order.order_status === "on_the_way"
                        ? "التوصيل جارٍ حاليًا."
                        : "هذا الطلب لم يعد متاحًا لإسناد سائق."}
                  </span>
                </div>
              ),
            ];
          })}
        />
      )}
    </DashboardShell>
  );
}
