"use client";

import { useEffect, useState } from "react";
import {
  formatOrderNumber,
  formatPaymentStatusLabel,
} from "@medifast/types";
import { Card } from "../../../../components/ui/card";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { useLocale } from "../../../../lib/i18n/locale-context";
import { buildPaginatedResult, DEFAULT_PAGE_SIZE, getPaginationRange, type PaginatedResult } from "../../../../lib/pagination";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { formatCurrency } from "../../../../lib/utils/format-currency";
import { formatDate } from "../../../../lib/utils/format-date";
import { assignDriverAction, updateAdminOrderStatusAction } from "../../../orders/actions";
import { OrderStatusBadge } from "../../../orders/components/order-status-badge";
import type { AdminOrderControlProps, AdminOrderManagerRow, AsyncState, DriverOption } from "../shared/admin-types";
import { normalizeError, readCategoryName, readName, readSingle } from "../shared/admin-utils";

const adminOverrideStatuses = [
  "placed",
  "accepted",
  "preparing",
  "rejected",
  "ready_for_pickup",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "cancelled",
];

type AdminOrdersData = PaginatedResult<AdminOrderManagerRow>;

async function loadAdminOrdersData(page: number): Promise<AdminOrdersData> {
  const supabase = getSupabaseBrowserClient();
  const { from, to } = getPaginationRange(page, DEFAULT_PAGE_SIZE);
  const { data, error, count } = await supabase
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
        profile:profiles!drivers_user_id_fkey(
        full_name)
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((order) => ({
    id: String(order.id),
    customerName: readName(
      readSingle((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile),
      "الزبون"
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

  return buildPaginatedResult(rows, count, { page, pageSize: DEFAULT_PAGE_SIZE });
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
  const [state, setState] = useState<AsyncState<AdminOrdersData>>({
    data: null,
    error: null,
    loading: true,
  });
  const [page, setPage] = useState(1);
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
      const [data, availableDrivers] = await Promise.all([loadAdminOrdersData(page), loadAvailableDrivers()]);
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
  }, [page]);

  async function handleStatusChange(orderId: string, nextStatus: string) {
    const previousOrders = state.data?.rows ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || previousOrder.orderStatus === nextStatus) {
      return;
    }

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data
          ? {
              ...current.data,
              rows: current.data.rows.map((order) =>
          order.id === orderId
            ? {
                ...order,
                orderStatus: nextStatus,
              }
            : order
              ),
            }
          : null,
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
        message: `تم تحديث الطلب ${formatOrderNumber(orderId)} إلى ${t(nextStatus.replaceAll("_", " "))}.`,
      });
    } catch (error) {
      setState((current) => ({
        data:
          current.data
            ? {
                ...current.data,
                rows: current.data.rows.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
                ),
              }
            : null,
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
    const previousOrders = state.data?.rows ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || !selectedDriverId) {
      return;
    }

    const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data
          ? {
              ...current.data,
              rows: current.data.rows.map((order) =>
          order.id === orderId
            ? {
                ...order,
                driverId: selectedDriverId,
                driverName: selectedDriver?.fullName ?? order.driverName,
                orderStatus: "assigned",
              }
            : order
              ),
            }
          : null,
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
        message: `تم تعيين سائق للطلب ${formatOrderNumber(orderId)}.`,
      });

      await load();
    } catch (error) {
      setState((current) => ({
        data:
          current.data
            ? {
                ...current.data,
                rows: current.data.rows.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  driverId: previousOrder.driverId,
                  driverName: previousOrder.driverName,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
                ),
              }
            : null,
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

  const orders = state.data?.rows ?? [];
  const orderCounts = {
    new: orders.filter((order) => order.orderStatus === "placed").length,
    activeVendor: orders.filter((order) => ["accepted", "preparing", "ready_for_pickup"].includes(order.orderStatus)).length,
    readyForDriver: orders.filter((order) => order.orderStatus === "ready_for_pickup" && !order.driverId).length,
    delivery: orders.filter((order) =>
  ["assigned", "picked_up", "on_the_way"].includes(order.orderStatus)
).length,
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
      <PaginationControls
        totalCount={state.data?.totalCount ?? 0}
        page={state.data?.page ?? page}
        pageCount={state.data?.pageCount ?? 1}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(state.data?.pageCount ?? current, current + 1))}
      />
      <Table
        title="مراقبة الطلبات"
        headers={["معرّف الطلب", "الزبون", "المتجر", "الإجمالي", "حالة الدفع", "حالة الطلب", "السائق", "تاريخ الإنشاء", "تصحيح يدوي"]}
        rows={orders.map((order) => [
          formatOrderNumber(order.id),
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

function PaginationControls({
  totalCount,
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  totalCount: number;
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card className="medical-panel">
      <div className="split-actions">
        <p className="muted">الإجمالي: {totalCount} · الصفحة {page} من {pageCount}</p>
        <div className="inline-actions">
          <button className="secondary-button" type="button" disabled={page <= 1} onClick={onPrevious}>
            السابق
          </button>
          <button className="secondary-button" type="button" disabled={page >= pageCount} onClick={onNext}>
            التالي
          </button>
        </div>
      </div>
    </Card>
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
