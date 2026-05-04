"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { LoadingState } from "../../../components/ui/loading-state";
import { Table } from "../../../components/ui/table";
import { OrderStatusBadge } from "./order-status-badge";
import { loadDriverOrdersData, normalizeError, type DriverOrdersData } from "../driver-orders";
import { formatCurrency } from "../../../lib/utils/format-currency";
import { formatDate } from "../../../lib/utils/format-date";
import { useLocale } from "../../../lib/i18n/locale-context";

function countOrdersByStatus(data: DriverOrdersData | null, statuses: string[]) {
  if (!data) {
    return 0;
  }

  return data.orders.filter((order) => statuses.includes(order.orderStatus)).length;
}

export function DriverDashboardClient() {
  const router = useRouter();
  const { t, intlLocale } = useLocale();
  const [data, setData] = useState<DriverOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadSummary() {
    setLoading(true);
    setError(null);

    try {
      setData(await loadDriverOrdersData());
    } catch (nextError) {
      setError(normalizeError(nextError));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSummary();
  }, []);

  if (loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="Loading driver dashboard..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={error} onRetry={() => void loadSummary()} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="medical-panel">
        <EmptyState title="No driver profile found" message="Link this account to a driver record to view assigned deliveries." />
      </Card>
    );
  }

  const assignedCount = countOrdersByStatus(data, ["assigned", "on_the_way"]);
  const pickupCount = countOrdersByStatus(data, ["assigned"]);
  const deliveredCount = countOrdersByStatus(data, ["delivered"]);
  const currentOrders = data.orders.filter((order) => ["assigned", "on_the_way"].includes(order.orderStatus));

  return (
    <div className="stack">
      <section className="detail-grid">
        <Card className="medical-panel">
          <strong>{t("Assigned Deliveries")}</strong>
          <p className="muted">{`${assignedCount} ${t("active orders are currently assigned to you.")}`}</p>
        </Card>
        <Card className="medical-panel">
          <strong>{t("Assigned to Start")}</strong>
          <p className="muted">{`${pickupCount} ${t("orders are assigned and ready for driver action.")}`}</p>
        </Card>
        <Card className="medical-panel">
          <strong>{t("Delivered")}</strong>
          <p className="muted">{`${deliveredCount} ${t("assigned orders have been completed.")}`}</p>
        </Card>
      </section>

      {currentOrders.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="No active deliveries" message="New assigned deliveries will appear here as soon as they are ready to move." />
          <Button onClick={() => router.push("/driver/orders")}>Open Orders</Button>
        </Card>
      ) : (
        <Table
          title="Current Deliveries"
          headers={["Order ID", "Vendor", "Customer", "Total", "Status", "Created"]}
          rows={currentOrders.map((order) => [
            order.id,
            order.vendorName,
            order.customerName,
            formatCurrency(order.total, intlLocale),
            <OrderStatusBadge key={`${order.id}-summary-status`} status={order.orderStatus} />,
            order.createdAt ? formatDate(order.createdAt, intlLocale) : "-",
          ])}
          emptyMessage="No current deliveries are assigned to you."
        />
      )}

      <div className="inline-actions">
        <Button onClick={() => router.push("/driver/orders")}>Open Delivery Queue</Button>
        <Button className="secondary-button" onClick={() => void loadSummary()}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
