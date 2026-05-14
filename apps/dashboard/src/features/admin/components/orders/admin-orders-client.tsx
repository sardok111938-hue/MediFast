"use client";

import { useEffect, useState } from "react";
import { formatPaymentStatusLabel } from "@medifast/types";
import { Card } from "../../../../components/ui/card";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { useLocale } from "../../../../lib/i18n/locale-context";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { formatCurrency } from "../../../../lib/utils/format-currency";
import { formatDate } from "../../../../lib/utils/format-date";
import { assignDriverAction, updateAdminOrderStatusAction } from "../../../orders/actions";
import { OrderStatusBadge } from "../../../orders/components/order-status-badge";
import type { AdminOrderControlProps, AdminOrderManagerRow, AsyncState, DriverOption } from "../shared/admin-types";
import { normalizeError, readCategoryName, readName, readSingle } from "../shared/admin-utils";

const adminOverrideStatuses = ["placed", "accepted", "preparing", "rejected", "ready_for_pickup", "assigned", "on_the_way", "delivered", "cancelled"];

async function loadAdminOrdersData(): Promise<AdminOrderManagerRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      driver_id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(name),
      customer:customers(
        profile:profiles(full_name)
      ),
      driver:drivers(
        profile:profiles!drivers_user_id_fkey(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => ({
    id: String(order.id),
    customerName: readName(
      readSingle((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile),
      "العميل"
    ),
    vendorName: readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null),
    total: Number(order.total ?? 0),
    paymentMethod: String(order.payment_method ?? ""),
    paymentStatus: String(order.payment_status),
    orderStatus: String(order.order_status),
    createdAt: String(order.created_at ?? ""),
    driverId: order.driver_id ? String(order.driver_id) : null,
    driverName: readName(
      readSingle((order.driver as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile),
      "غير معيّن"
    ),
  }));
}

async function loadAvailableDrivers(): Promise<DriverOption[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      profiles!drivers_user_id_fkey(full_name)
    `)
    .eq("is_available", true)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((driver) => {
    const profile = readSingle(
      driver.profiles as { full_name?: string } | { full_name?: string }[] | null
    );

    return {
      id: String(driver.id),
      fullName: profile?.full_name ?? "السائق",
    };
  });
}

function AdminOrdersManager() {
  const { t } = useLocale();
  const [state, setState] = useState<AsyncState<AdminOrderManagerRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const [data, availableDrivers] = await Promise.all([loadAdminOrdersData(), loadAvailableDrivers()]);
      setState({
        data,
        error: null,
        loading: false,
      });
      setDrivers(availableDrivers);
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
      setDrivers([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(orderId: string, nextStatus: string) {
    const previousOrders = state.data ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || previousOrder.orderStatus === nextStatus) {
      return;
    }

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data?.map((order) =>
          order.id === orderId
            ? {
                ...order,
                orderStatus: nextStatus,
              }
            : order
        ) ?? null,
      error: current.error,
      loading: current.loading,
    }));

    try {
      const result = await updateAdminOrderStatusAction({
        orderId,
        nextStatus,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث حالة الطلب.");
      }

      setFeedback({
        type: "success",
        message: `تم تحديث الطلب ${orderId} إلى ${t(nextStatus.replaceAll("_", " "))}.`,
      });
    } catch (error) {
      setState((current) => ({
        data:
          current.data?.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
          ) ?? null,
        error: current.error,
        loading: current.loading,
      }));
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleDriverAssign(orderId: string, selectedDriverId: string) {
    const previousOrders = state.data ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || !selectedDriverId) {
      return;
    }

    const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data?.map((order) =>
          order.id === orderId
            ? {
                ...order,
                driverId: selectedDriverId,
                driverName: selectedDriver?.fullName ?? order.driverName,
                orderStatus: "assigned",
              }
            : order
        ) ?? null,
      error: current.error,
      loading: current.loading,
    }));

    try {
      const result = await assignDriverAction({
        orderId,
        driverId: selectedDriverId,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إسناد السائق.");
      }

      setFeedback({
        type: "success",
        message: `تم تعيين سائق للطلب ${orderId}.`,
      });

      await load();
    } catch (error) {
      setState((current) => ({
        data:
          current.data?.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  driverId: previousOrder.driverId,
                  driverName: previousOrder.driverName,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
          ) ?? null,
        error: current.error,
        loading: current.loading,
      }));
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الطلبات من Supabase..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => void load()} />
      </Card>
    );
  }

  const orders = state.data ?? [];
  const orderCounts = {
    new: orders.filter((order) => order.orderStatus === "placed").length,
    activeVendor: orders.filter((order) => ["accepted", "preparing", "ready_for_pickup"].includes(order.orderStatus)).length,
    readyForDriver: orders.filter((order) => order.orderStatus === "ready_for_pickup" && !order.driverId).length,
    delivery: orders.filter((order) => ["assigned", "on_the_way"].includes(order.orderStatus)).length,
  };

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>طلبات جديدة لدى الصيدليات</strong>
              <span>{orderCounts.new}</span>
            </div>
            <div className="detail-block">
              <strong>قيد تشغيل الصيدلية</strong>
              <span>{orderCounts.activeVendor}</span>
            </div>
            <div className="detail-block">
              <strong>جاهزة لإسناد سائق</strong>
              <span>{orderCounts.readyForDriver}</span>
            </div>
            <div className="detail-block">
              <strong>توصيل نشط</strong>
              <span>{orderCounts.delivery}</span>
            </div>
          </div>
        </Card>
      </section>
      <Table
        title="مراقبة الطلبات"
        headers={["معرّف الطلب", "العميل", "المتجر", "الإجمالي", "حالة الدفع", "حالة الطلب", "السائق", "تاريخ الإنشاء", "تصحيح يدوي"]}
        rows={orders.map((order) => [
          order.id,
          order.customerName,
          order.vendorName,
          formatCurrency(order.total),
          formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod),
          <OrderStatusBadge key={`${order.id}-status`} status={order.orderStatus} />,
          <AdminDriverAssignControl
            key={`${order.id}-driver`}
            order={order}
            drivers={drivers}
            disabled={updatingOrderId === order.id || (order.orderStatus !== "ready_for_pickup" && !order.driverId)}
            selectLabel={t("Select driver")}
            onAssign={handleDriverAssign}
          />,
          order.createdAt ? formatDate(order.createdAt) : "-",
          <AdminOrderOverrideControl
            key={`${order.id}-override`}
            order={order}
            statuses={adminOverrideStatuses}
            disabled={updatingOrderId === order.id}
            t={t}
            onStatusChange={handleStatusChange}
          />,
        ])}
        emptyMessage="لا توجد طلبات متاحة بعد."
      />
    </div>
  );
}

function AdminDriverAssignControl({
  order,
  drivers,
  disabled,
  selectLabel,
  onAssign,
}: AdminOrderControlProps & {
  drivers: DriverOption[];
  selectLabel: string;
  onAssign: (orderId: string, selectedDriverId: string) => void;
}) {
  return (
    <div className="table-actions">
      <div className="field">
        <select
          className="input"
          value={order.driverId ?? ""}
          disabled={disabled}
          aria-label={selectLabel}
          onChange={(event) => onAssign(order.id, event.target.value)}
        >
          <option value="">{selectLabel}</option>
          {drivers.map((driver) => (
            <option key={driver.id} value={driver.id}>
              {driver.fullName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function AdminOrderOverrideControl({
  order,
  statuses,
  disabled,
  t,
  onStatusChange,
}: AdminOrderControlProps & {
  statuses: string[];
  t: (key: string) => string;
  onStatusChange: (orderId: string, nextStatus: string) => void;
}) {
  return (
    <div className="table-actions">
      <details>
        <summary className="secondary-button admin-summary-button">تجاوز</summary>
        <div className="field">
          <select
            className="input"
            value={order.orderStatus}
            disabled={disabled}
            aria-label="تصحيح حالة الطلب يدويًا"
            onChange={(event) => onStatusChange(order.id, event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {t(status.replaceAll("_", " "))}
              </option>
            ))}
          </select>
        </div>
      </details>
    </div>
  );
}

export function AdminOrdersClient() {
  return <AdminOrdersManager />;
}
