"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { LoadingState } from "../../../components/ui/loading-state";
import { Table } from "../../../components/ui/table";
import { formatCurrency } from "../../../lib/utils/format-currency";
import { formatDate } from "../../../lib/utils/format-date";
import {
  getDriverNextActions,
  loadDriverOrdersData,
  normalizeError,
  type DriverOrdersData,
} from "../driver-orders";
import { OrderStatusBadge } from "./order-status-badge";
import { useLocale } from "../../../lib/i18n/locale-context";
import { updateDriverOrderStatusAction } from "../actions";

export function DriverOrdersClient() {
  const { t, intlLocale } = useLocale();
  const [data, setData] = useState<DriverOrdersData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  async function loadOrders() {
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
    void loadOrders();
  }, []);

  async function handleStatusUpdate(orderId: string, nextStatus: string) {
    if (!data) {
      return;
    }

    const previousOrder = data.orders.find((order) => order.id === orderId);
    if (!previousOrder) {
      return;
    }

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setData((current) =>
      current
        ? {
            ...current,
            orders: current.orders.map((order) =>
              order.id === orderId
                ? {
                    ...order,
                    orderStatus: nextStatus,
                  }
                : order
            ),
          }
        : current
    );

    try {
      const result = await updateDriverOrderStatusAction({
        orderId,
        nextStatus,
      });

      if (!result.success) {
        throw new Error(result.error ?? "Order status could not be updated.");
      }

      setFeedback({
        type: "success",
        message: `تم تحديث الطلب ${orderId} إلى ${t(nextStatus.replaceAll("_", " "))}.`,
      });
      await loadOrders();
    } catch (nextError) {
      setData((current) =>
        current
          ? {
              ...current,
              orders: current.orders.map((order) =>
                order.id === orderId
                  ? {
                      ...order,
                      orderStatus: previousOrder.orderStatus,
                    }
                  : order
              ),
            }
          : current
      );
      setFeedback({
        type: "error",
        message: normalizeError(nextError),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الشحنات المعيّنة..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={error} onRetry={() => void loadOrders()} />
      </Card>
    );
  }

  if (!data || data.orders.length === 0) {
    return (
      <Card className="medical-panel">
        <EmptyState title="لا توجد شحنات معيّنة" message="ستظهر الطلبات المعيّنة لهذا السائق هنا بعد اكتمال الإسناد." />
      </Card>
    );
  }

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      <Table
        title="الطلبات المعيّنة"
        headers={["معرّف الطلب", "المتجر", "العميل", "الإجمالي", "عنوان التوصيل", "حالة الطلب", "تاريخ الإنشاء"]}
        rows={data.orders.map((order) => [
          order.id,
          order.vendorName,
          order.customerName,
          formatCurrency(order.total, intlLocale),
          order.deliveryAddress,
          <OrderStatusBadge key={`${order.id}-status`} status={order.orderStatus} />,
          order.createdAt ? formatDate(order.createdAt, intlLocale) : "-",
        ])}
        emptyMessage="لا توجد طلبات معيّنة لهذا السائق."
      />

      <section className="detail-grid">
        {data.orders.map((order) => {
          const actions = getDriverNextActions(order.orderStatus);

          return (
            <Card key={order.id} className="medical-panel">
              <div className="inline-actions split-actions">
                <div>
                  <h3 className="order-card-title">{`${t("Order")} ${order.id}`}</h3>
                  <p className="muted order-card-subtitle">
                    {`${order.vendorName} ← ${order.customerName}`}
                  </p>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>

              <div className="detail-meta">
                <div className="detail-block">
                  <strong>{t("Total")}</strong>
                  <span>{formatCurrency(order.total, intlLocale)}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Created")}</strong>
                  <span>{order.createdAt ? formatDate(order.createdAt, intlLocale) : "-"}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Address")}</strong>
                  <span>{order.deliveryAddress}</span>
                </div>
              </div>

              <div className="inline-actions">
                {actions.length === 0 ? <p className="muted">لا توجد إجراءات متاحة للسائق لهذا الطلب.</p> : null}
                {actions.map((action) => (
                  <Button
                    key={`${order.id}-${action.nextStatus}`}
                    disabled={updatingOrderId === order.id}
                    onClick={() => void handleStatusUpdate(order.id, action.nextStatus)}
                  >
                    {updatingOrderId === order.id ? "جارٍ التحديث..." : action.label}
                  </Button>
                ))}
              </div>
            </Card>
          );
        })}
      </section>
    </div>
  );
}
