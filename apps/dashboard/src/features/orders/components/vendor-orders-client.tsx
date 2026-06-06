"use client";

import { useEffect, useMemo, useState } from "react";
import { formatOrderNumber, formatPaymentStatusLabel } from "@medifast/types";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingState } from "../../../components/ui/loading-state";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Table } from "../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { formatCurrency } from "../../../lib/utils/format-currency";
import { formatDate } from "../../../lib/utils/format-date";
import { buildPaginatedResult, DEFAULT_PAGE_SIZE, getPaginationRange, type PaginatedResult } from "../../../lib/pagination";
import { OrderStatusBadge } from "./order-status-badge";
import { useLocale } from "../../../lib/i18n/locale-context";
import { updateVendorOrderStatusAction } from "../actions";
import { subscribeToVendorOrders } from "../realtime";

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
  orders: PaginatedResult<VendorOrder>;
  statusCounts: Record<VendorOrderStatusFilter, number>;
};

const vendorOrderStatuses = [
  "placed",
  "accepted",
  "preparing",
  "ready_for_pickup",
  "assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "rejected",
] as const;
const activeVendorStatuses = new Set(["accepted", "preparing", "ready_for_pickup"]);
const deliveryVendorStatuses = new Set(["assigned", "picked_up", "on_the_way"]);
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
      { label: "قبول الطلب", nextStatus: "accepted", tone: "primary" as const },
      { label: "رفض الطلب", nextStatus: "rejected", tone: "danger" as const },
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

async function loadVendorOrdersData(page: number, statusFilter: VendorOrderStatusFilter): Promise<VendorOrderData> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    throw new Error("حساب المتجر غير مرتبط بشكل صحيح.");
  }

  const { from, to } = getPaginationRange(page, DEFAULT_PAGE_SIZE);
  let query = supabase
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
        product:products!order_items_product_id_fkey(name)
      )
    `, { count: "exact" })
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (statusFilter !== "all") {
    query = query.eq("order_status", statusFilter);
  }

  const countQueries = [
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId),
    ...vendorOrderStatuses.map((status) =>
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("vendor_id", vendorId)
        .eq("order_status", status),
    ),
  ];

  const [{ data, error, count }, allCountResult, ...statusCountResults] = await Promise.all([query, ...countQueries]);

  if (error) {
    throw error;
  }

  const statusCounts = statusCountResults.reduce<Record<VendorOrderStatusFilter, number>>(
    (accumulator, result, index) => {
      accumulator[vendorOrderStatuses[index]] = result.count ?? 0;
      return accumulator;
    },
    { all: allCountResult.count ?? 0 } as Record<VendorOrderStatusFilter, number>,
  );

  const rows = (data ?? []).map((order) => {
    const items = Array.isArray(order.items) ? order.items : [];

    return {
      id: String(order.id),
      customerName: readName((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile, "الزبون"),
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
  });

  return {
    vendorId: String(vendorId),
    orders: buildPaginatedResult(rows, count, { page, pageSize: DEFAULT_PAGE_SIZE }),
    statusCounts,
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
  const [page, setPage] = useState(1);

  async function loadOrders(showLoading = true) {
    if (showLoading) {
      setLoading(true);
    }
    setError(null);

    try {
      const nextData = await loadVendorOrdersData(page, statusFilter);
      setData(nextData);
    } catch (nextError) {
      setError(normalizeError(nextError));
      setData(null);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    void loadOrders();
  }, [page, statusFilter]);

  function changeStatusFilter(nextFilter: VendorOrderStatusFilter) {
    setStatusFilter(nextFilter);
    setPage(1);
  }

  useEffect(() => {
    if (!data?.vendorId) {
      return;
    }

    const channel = subscribeToVendorOrders(data.vendorId, () => {
      void loadOrders(false);
    });

    return () => {
      void getSupabaseBrowserClient().removeChannel(channel);
    };
  }, [data?.vendorId]);

  const orderCounts = useMemo(() => {
    const counts = data?.statusCounts;

    return vendorOrderStatuses.map((status) => ({
      status,
      count: counts?.[status] ?? 0,
    }));
  }, [data]);

  const filteredOrders = useMemo(() => data?.orders.rows ?? [], [data]);

  const newOrders = useMemo(() => filteredOrders.filter((order) => order.orderStatus === "placed"), [filteredOrders]);
  const activeOrders = useMemo(() => filteredOrders.filter((order) => activeVendorStatuses.has(order.orderStatus)), [filteredOrders]);
  const deliveryOrders = useMemo(
    () => filteredOrders.filter((order) => deliveryVendorStatuses.has(order.orderStatus)),
    [filteredOrders]
  );
  
  const historyOrders = useMemo(
  () =>
    filteredOrders.filter(
      (order) =>
        order.orderStatus !== "placed" &&
        !activeVendorStatuses.has(order.orderStatus) &&
        !deliveryVendorStatuses.has(order.orderStatus)
    ),
  [filteredOrders]
);

  async function updateVendorOrderStatus(orderId: string, nextStatus: string) {
    if (!data) {
      return;
    }

    const previousOrder = data.orders.rows.find((order) => order.id === orderId);
    if (!previousOrder) {
      return;
    }

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setData((current) =>
      current
        ? {
            ...current,
            orders: {
              ...current.orders,
              rows: current.orders.rows.map((order) =>
                order.id === orderId
                  ? {
                      ...order,
                      orderStatus: nextStatus,
                    }
                  : order
              ),
            },
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
        message: `تم تحديث الطلب ${formatOrderNumber(orderId)} إلى ${t(nextStatus.replaceAll("_", " "))}.`,
      });
      await loadOrders();
    } catch (nextError) {
      setData((current) =>
        current
          ? {
              ...current,
              orders: {
                ...current.orders,
                rows: current.orders.rows.map((order) =>
                  order.id === orderId
                    ? {
                        ...order,
                        orderStatus: previousOrder.orderStatus,
                      }
                    : order
                ),
              },
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

  if (!data || data.orders.totalCount === 0) {
    return (
      <Card className="medical-panel">
        <EmptyState title="لا توجد طلبات بعد" message="ستظهر طلبات المتجر هنا بمجرد أن يبدأ الزبائن في الشراء." />
      </Card>
    );
  }

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      <Card className="medical-panel">
        <div className="split-actions">
          <div>
            <h3 className="order-card-title">طابور الصيدلية</h3>
            
            <p className="muted order-card-subtitle"> 
              الطلبات الجديدة والمقبولة التي تحتاج متابعة من الصيدلية.
              </p>
          </div>
        </div>
        <div className="filter-chip-row">
          <button type="button" className={`filter-chip ${statusFilter === "all" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("all")}>
            <span>{t("All Orders")}</span>
            <strong>{data.statusCounts.all}</strong>
          </button>
          {orderCounts.map(({ status, count }) => (
            <button
              type="button"
              key={status}
              className={`filter-chip ${statusFilter === status ? "filter-chip-active" : ""}`.trim()}
              onClick={() => changeStatusFilter(status)}
            >
              <span>{t(status.replaceAll("_", " "))}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
      </Card>

      <PaginationControls
        totalCount={data.orders.totalCount}
        page={data.orders.page}
        pageCount={data.orders.pageCount}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(data.orders.pageCount, current + 1))}
      />

      <section className="stack">
        <div>
          <h3 className="order-card-title">طلبات جديدة</h3>
          <p className="muted order-card-subtitle">طلبات الزبائن بحالة placed وتحتاج قبول الطلب أو رفضه من الصيدلية.</p>
        </div>
        {newOrders.length === 0 ? (
          <Card className="medical-panel">
            <EmptyState title="لا توجد طلبات جديدة" message="ستظهر هنا الطلبات الجديدة فور إنشائها من الزبون." />
          </Card>
        ) : null}
        <section className="detail-grid">
          {newOrders.map((order) => (
            <VendorOrderCard
              key={order.id}
              order={order}
              actions={getNextActions(order.orderStatus)}
              updatingOrderId={updatingOrderId}
              onUpdate={updateVendorOrderStatus}
              intlLocale={intlLocale}
              t={t}
            />
          ))}
        </section>
      </section>

      <section className="stack">
        <div>
          <h3 className="order-card-title">طلبات نشطة</h3>
          <p className="muted order-card-subtitle">طلبات مقبولة أو قيد التحضير أو جاهزة للاستلام قبل انتقالها إلى السائق.</p>
        </div>
        {activeOrders.length === 0 ? (
          <Card className="medical-panel">
            <EmptyState title="لا توجد طلبات نشطة" message="بعد قبول الطلب سيظهر هنا حتى يصبح جاهزًا للاستلام." />
          </Card>
        ) : null}
        <section className="detail-grid">
          {activeOrders.map((order) => (
            <VendorOrderCard
              key={order.id}
              order={order}
              actions={getNextActions(order.orderStatus)}
              updatingOrderId={updatingOrderId}
              onUpdate={updateVendorOrderStatus}
              intlLocale={intlLocale}
              t={t}
            />
          ))}
        </section>
      </section>

      <section className="stack">
        <div>
          <h3 className="order-card-title">التوصيل جارٍ</h3>
          <p className="muted order-card-subtitle">
      طلبات استلمها السائق أو في طريقها للزبون.
      </p>
  </div>
  {deliveryOrders.length === 0 ? (
    <Card className="medical-panel">
      <EmptyState title="لا توجد طلبات قيد التوصيل" message="ستظهر هنا الطلبات بعد إسنادها للسائق." />
    </Card>
  ) : null}
  <section className="detail-grid">
    {deliveryOrders.map((order) => (
      <VendorOrderCard
        key={order.id}
        order={order}
        actions={[]}
        updatingOrderId={updatingOrderId}
        onUpdate={updateVendorOrderStatus}
        intlLocale={intlLocale}
        t={t}
      />
    ))}
  </section>
</section>

      <Table
        title="سجل الطلبات"
        headers={["معرّف الطلب", "الزبون", "العناصر", "الإجمالي", "حالة الدفع", "عنوان التوصيل", "حالة الطلب", "تاريخ الإنشاء"]}
        rows={historyOrders.map((order) => [
          formatOrderNumber(order.id),
          order.customerName,
          `${order.items.length} عنصر`,
          formatCurrency(order.total, intlLocale),
          formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod),
          order.deliveryAddress,
          <OrderStatusBadge key={`${order.id}-status`} status={order.orderStatus} />,
          order.createdAt ? formatDate(order.createdAt, intlLocale) : "-",
        ])}
        emptyMessage={statusFilter === "all" ? "لا توجد طلبات مكتملة أو مسندة بعد." : "لا توجد طلبات للمتجر في هذه المرحلة حاليًا."}
      />
    </div>
  );
}

function VendorOrderCard({
  order,
  actions,
  updatingOrderId,
  onUpdate,
  intlLocale,
  t,
}: {
  order: VendorOrder;
  actions: ReturnType<typeof getNextActions>;
  updatingOrderId: string | null;
  onUpdate: (orderId: string, nextStatus: string) => void;
  intlLocale: string;
  t: (key: string) => string;
}) {
  return (
    <Card className="medical-panel">
      <div className="inline-actions split-actions">
        <div>
          <h3 className="order-card-title">{`${t("Order")} ${formatOrderNumber(order.id)}`}</h3>
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
        {actions.length === 0 ? (
          deliveryVendorStatuses.has(order.orderStatus) ? (
          <p className="muted">السائق يتولى التوصيل حالياً.</p>
        ) : (
        <p className="muted">لا توجد إجراءات متاحة للمتجر لهذا الطلب.</p>
        )
      ) : null}
        
        {actions.map((action) => (
          <Button
            key={`${order.id}-${action.nextStatus}`}
            variant={action.tone === "danger" ? "danger" : action.tone === "secondary" ? "secondary" : "primary"}
            disabled={updatingOrderId === order.id}
            onClick={() => onUpdate(order.id, action.nextStatus)}
          >
            {updatingOrderId === order.id ? "جارٍ التحديث..." : action.label}
          </Button>
        ))}
      </div>
    </Card>
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
