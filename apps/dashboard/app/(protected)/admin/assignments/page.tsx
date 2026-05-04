import { redirect } from "next/navigation";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { Card } from "../../../../src/components/ui/card";
import { OrderStatusBadge } from "../../../../src/features/orders/components/order-status-badge";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { assignDriver } from "../../../../src/features/orders/api";
import { listAvailableApprovedDrivers } from "../../../../src/features/drivers/queries";
import { listAdminOrderDetails } from "../../../../src/features/orders/queries";
import { formatCurrency } from "../../../../src/lib/utils/format-currency";
import { formatDate } from "../../../../src/lib/utils/format-date";
import { AssignmentSubmitButton } from "../../../../src/features/admin/components/assignment-submit-button";

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
      redirect(`/admin/assignments?filter=${activeFilter}&error=${encodeURIComponent("Only ready-for-pickup orders can be assigned.")}`);
    }

    const result = await assignDriver(orderId, driverId);

    if (result.error) {
      redirect(`/admin/assignments?filter=${activeFilter}&error=${encodeURIComponent(result.error.message)}`);
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
    <DashboardShell title="Driver Assignment" subtitle="Assign approved drivers once vendor orders are ready for pickup." nav={dashboardNavigation.admin}>
      <PageHeader title="Driver Assignment" description="Review dispatch-ready orders, filter the delivery queue, and assign available drivers with clear operational context.">
        {resolvedSearchParams?.success ? <p className="success">Driver assigned successfully.</p> : null}
        {resolvedSearchParams?.error ? <p className="danger">{resolvedSearchParams.error}</p> : null}
        <p className="muted">
          Default view shows only <strong>ready_for_pickup</strong> orders so dispatch can focus on what needs action right now.
        </p>
      </PageHeader>

      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="split-actions assignment-summary">
            <div>
              <strong>Assignment Filters</strong>
              <p className="muted assignment-summary-text">Use these filters to move between pickup-ready work, active deliveries, and completed orders.</p>
            </div>
            <div className="filter-chip-row">
              {counts.map(({ filter, count }) => (
                <a
                  key={filter}
                  href={filterHref(filter)}
                  className={`filter-chip ${currentFilter === filter ? "filter-chip-active" : ""}`.trim()}
                >
                  <span>{filter.replaceAll("_", " ")}</span>
                  <strong>{count}</strong>
                </a>
              ))}
            </div>
          </div>
        </Card>

        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>Available Drivers</strong>
              <span>{drivers.length}</span>
            </div>
            <div className="detail-block">
              <strong>Current Filter</strong>
              <span>{currentFilter.replaceAll("_", " ")}</span>
            </div>
            <div className="detail-block">
              <strong>Orders in View</strong>
              <span>{filteredOrders.length}</span>
            </div>
          </div>
        </Card>
      </section>

      {filteredOrders.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState
            title="No orders in this stage"
            message={currentFilter === "ready_for_pickup" ? "No vendor-approved orders are waiting for a driver right now." : "No orders match the selected delivery stage."}
          />
        </Card>
      ) : (
        <Table
          title="Assignment Queue"
          headers={["Order", "Customer", "Vendor", "Delivery Address", "Total", "Created Date", "Order Status", "Driver Action"]}
          emptyMessage="No orders are currently waiting for driver assignment."
          rows={filteredOrders.map((order) => {
            const assignable = order.order_status === "ready_for_pickup" && !blockedStatuses.has(order.order_status);
            const address = formatAddress(order);

            return [
              order.id,
              order.customer_name,
              order.vendor_name,
              address || "-",
              formatCurrency(order.total, "ar-EG"),
              order.created_at ? formatDate(order.created_at, "ar-EG") : "-",
              <OrderStatusBadge key={`${order.id}-status`} status={order.order_status} />,
              assignable ? (
                <form key={`${order.id}-assign`} action={handleAssignDriver} className="assignment-form">
                  <input type="hidden" name="order_id" value={order.id} />
                  <input type="hidden" name="active_filter" value={currentFilter} />
                  <select name="driver_id" className="input" defaultValue="" disabled={drivers.length === 0}>
                    <option value="" disabled>
                      Select driver
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
                      ? "Driver has been assigned and is waiting to start delivery."
                      : order.order_status === "on_the_way"
                        ? "Delivery is currently in progress."
                        : "This order is no longer available for driver assignment."}
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
