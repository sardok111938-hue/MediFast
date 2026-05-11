"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPaymentStatusLabel } from "@medifast/types";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingState } from "../../../components/ui/loading-state";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Table } from "../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { formatCurrency } from "../../../lib/utils/format-currency";
import { formatDate } from "../../../lib/utils/format-date";
import { OrderStatusBadge } from "./order-status-badge";
import { useLocale } from "../../../lib/i18n/locale-context";
import { updateVendorOrderStatusAction } from "../actions";

type VendorOrderItem = {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type VendorOrder = {
  id: string;
  customerName: string;
  driverName: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  deliveryAddress: string;
  items: VendorOrderItem[];
};

type VendorOrderData = {
  vendorId: string;
  orders: VendorOrder[];
};

const vendorOrderStatuses = ["placed", "accepted", "preparing", "ready_for_pickup", "assigned", "on_the_way", "delivered", "rejected"] as const;
type VendorOrderStatusFilter = "all" | (typeof vendorOrderStatuses)[number];

function readSingle<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readName(value: { full_name?: string } | { full_name?: string }[] | null | undefined, fallback: string) {
  return readSingle(value)?.full_name ?? fallback;
}

function readProductName(value: { name?: string } | { name?: string }[] | null | undefined, fallback: string) {
  return readSingle(value)?.name ?? fallback;
}

function formatDeliveryAddress(
  value:
    | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }
    | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }[]
    | null
    | undefined
) {
  const address = readSingle(value);

  return address?.line_1 || "عنوان التوصيل غير متاح";
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تحميل طلبات المتجر الآن.";
}

function getNextActions(status: string) {
  if (status === "pending" || status === "placed") {
    return [
      { label: "قبول", nextStatus: "accepted", tone: "primary" as const },
      { label: "رفض", nextStatus: "rejected", tone: "danger" as const },
    ];
  }

  if (status === "accepted") {
    return [{ label: "بدء التحضير", nextStatus: "preparing", tone: "secondary" as const }];
  }

  if (status === "preparing") {
    return [{ label: "جاهز للاستلام", nextStatus: "ready_for_pickup", tone: "secondary" as const }];
  }

  return [];
}

async function loadVendorOrdersData(): Promise<VendorOrderData> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    throw new Error("حساب المتجر غير مرتبط بشكل صحيح.");
  }

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      customer:customers(
        profile:profiles(full_name)
      ),
      driver:drivers(
        profile:profiles(full_name)
      ),
      address:addresses(
  line_1,
  lat,
  lng
),
      items:order_items(
        id,
        quantity,
        unit_price,
        total_price,
        product:products(name)
      )
    `)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    vendorId: String(vendorId),
    orders: (data ?? []).map((order) => {
      const items = Array.isArray(order.items) ? order.items : [];

      return {
        id: String(order.id),
        customerName: readName((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile, "العميل"),
        driverName: readName((order.driver as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile, "غير معيّن"),
        total: Number(order.total ?? 0),
        paymentMethod: String(order.payment_method ?? ""),
        paymentStatus: String(order.payment_status),
        orderStatus: String(order.order_status),
        createdAt: String(order.created_at ?? ""),
        deliveryAddress: formatDeliveryAddress(
          order.address as
            | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }
            | { line_1?: string | null; lat?: number | string | null; lng?: number | string | null }[]
            | null
        ),
        items: items.map((item) => ({
          id: String(item.id),
          productName: readProductName(item.product as { name?: string } | { name?: string }[] | null, "المنتج"),
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unit_price ?? 0),
          totalPrice: Number(item.total_price ?? 0),
        })),
      };
    }),
  };
}

export function VendorOrdersClient({ initialStatusFilter }: { initialStatusFilter?: string }) {
  const { t, intlLocale } = useLocale();
  const [data, setData] = useState<VendorOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VendorOrderStatusFilter>(
    initialStatusFilter && vendorOrderStatuses.includes(initialStatusFilter as (typeof vendorOrderStatuses)[number])
      ? (initialStatusFilter as VendorOrderStatusFilter)
      : "all"
  );

  async function loadOrders() {
    setLoading(true);
    setError(null);

    try {
      const nextData = await loadVendorOrdersData();
      setData(nextData);
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

  const orderCounts = useMemo(() => {
    const orders = data?.orders ?? [];

    return vendorOrderStatuses.map((status) => ({
      status,
      count: orders.filter((order) => order.orderStatus === status).length,
    }));
  }, [data]);

  const filteredOrders = useMemo(() => {
    const orders = data?.orders ?? [];

    if (statusFilter === "all") {
      return orders;
    }

    return orders.filter((order) => order.orderStatus === statusFilter);
  }, [data, statusFilter]);

  async function updateVendorOrderStatus(orderId: string, nextStatus: string) {
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
      const result = await updateVendorOrderStatusAction({
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
        <LoadingState message="جارٍ تحميل طلبات المتجر..." />
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
        <EmptyState title="لا توجد طلبات بعد" message="ستظهر طلبات المتجر هنا بمجرد أن يبدأ العملاء في الشراء." />
      </Card>
    );
  }

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      <Card className="medical-panel">
        <div className="split-actions">
          <div>
            <h3 className="order-card-title">مراحل الطلب</h3>
            <p className="muted order-card-subtitle">صفِّ قائمة التنفيذ حسب المرحلة ونفّذ فقط الإجراء المناسب التالي على الطلبات الجاهزة.</p>
          </div>
        </div>
        <div className="filter-chip-row">
          <button type="button" className={`filter-chip ${statusFilter === "all" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("all")}>
            <span>{t("All Orders")}</span>
            <strong>{data.orders.length}</strong>
          </button>
          {orderCounts.map(({ status, count }) => (
            <button
              type="button"
              key={status}
              className={`filter-chip ${statusFilter === status ? "filter-chip-active" : ""}`.trim()}
              onClick={() => setStatusFilter(status)}
            >
              <span>{t(status.replaceAll("_", " "))}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
      </Card>

      <Table
        title="الطلبات"
        headers={["معرّف الطلب", "العميل", "العناصر", "الإجمالي", "حالة الدفع", "عنوان التوصيل", "حالة الطلب", "تاريخ الإنشاء"]}
        rows={filteredOrders.map((order) => [
          order.id,
          order.customerName,
          `${order.items.length} عنصر`,
          formatCurrency(order.total, intlLocale),
          formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod),
          order.deliveryAddress,
          <OrderStatusBadge key={`${order.id}-status`} status={order.orderStatus} />,
          order.createdAt ? formatDate(order.createdAt, intlLocale) : "-",
        ])}
        emptyMessage={statusFilter === "all" ? "لا توجد طلبات للمتجر." : "لا توجد طلبات للمتجر في هذه المرحلة حاليًا."}
      />

      <section className="detail-grid">
        {filteredOrders.length === 0 ? (
          <Card className="medical-panel">
            <EmptyState title="لا توجد طلبات في هذه المرحلة" message="جرّب مرحلة أخرى أو انتظر وصول الطلب التالي من العميل." />
          </Card>
        ) : null}

        {filteredOrders.map((order) => {
          const actions = getNextActions(order.orderStatus);

          return (
            <Card key={order.id} className="medical-panel">
              <div className="inline-actions split-actions">
                <div>
                  <h3 className="order-card-title">{`${t("Order")} ${order.id}`}</h3>
                  <p className="muted order-card-subtitle">{`${t("Customer:")} ${order.customerName}`}</p>
                </div>
                <OrderStatusBadge status={order.orderStatus} />
              </div>

              <div className="detail-meta">
                <div className="detail-block">
                  <strong>{t("Total")}</strong>
                  <span>{formatCurrency(order.total, intlLocale)}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Payment Status")}</strong>
                  <span>{formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Created")}</strong>
                  <span>{order.createdAt ? formatDate(order.createdAt, intlLocale) : "-"}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Driver")}</strong>
                  <span>{order.driverName}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Address")}</strong>
                  <span>{order.deliveryAddress}</span>
                </div>
              </div>

              <Table
                title="عناصر الطلب"
                headers={["المنتج", "الكمية", "سعر الوحدة", "الإجمالي"]}
                rows={order.items.map((item) => [
                  item.productName,
                  `${item.quantity}`,
                  formatCurrency(item.unitPrice, intlLocale),
                  formatCurrency(item.totalPrice, intlLocale),
                ])}
                emptyMessage="لا توجد عناصر مرتبطة بهذا الطلب."
              />

              <div className="inline-actions">
                {actions.length === 0 ? <p className="muted">لا توجد إجراءات متاحة للمتجر لهذا الطلب.</p> : null}
                {actions.map((action) => (
                  <Button
                    key={`${order.id}-${action.nextStatus}`}
                    variant={action.tone === "danger" ? "danger" : action.tone === "secondary" ? "secondary" : "primary"}
                    disabled={updatingOrderId === order.id}
                    onClick={() => void updateVendorOrderStatus(order.id, action.nextStatus)}
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
