"use client";

import { useEffect, useState } from "react";
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
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  items: VendorOrderItem[];
};

type VendorOrderData = {
  vendorId: string;
  orders: VendorOrder[];
};

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

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load vendor orders right now.";
}

function getNextActions(status: string) {
  if (status === "pending" || status === "placed") {
    return [
      { label: "Accept Order", nextStatus: "accepted", tone: "primary" as const },
      { label: "Reject Order", nextStatus: "rejected", tone: "danger" as const },
    ];
  }

  if (status === "accepted") {
    return [{ label: "Mark Preparing", nextStatus: "preparing", tone: "secondary" as const }];
  }

  if (status === "preparing") {
    return [{ label: "Ready for Pickup", nextStatus: "ready_for_pickup", tone: "secondary" as const }];
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
    throw new Error("Vendor account is not linked correctly.");
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
        customerName: readName((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile, "Customer"),
        total: Number(order.total ?? 0),
        paymentMethod: String(order.payment_method ?? ""),
        paymentStatus: String(order.payment_status),
        orderStatus: String(order.order_status),
        createdAt: String(order.created_at ?? ""),
        items: items.map((item) => ({
          id: String(item.id),
          productName: readProductName(item.product as { name?: string } | { name?: string }[] | null, "Product"),
          quantity: Number(item.quantity ?? 0),
          unitPrice: Number(item.unit_price ?? 0),
          totalPrice: Number(item.total_price ?? 0),
        })),
      };
    }),
  };
}

export function VendorOrdersClient() {
  const { t, intlLocale } = useLocale();
  const [data, setData] = useState<VendorOrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);

    try {
      const nextData = await loadVendorOrdersData();
      setData(nextData);
    } catch (error) {
      setError(normalizeError(error));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("orders")
        .update({ order_status: nextStatus })
        .eq("id", orderId)
        .eq("vendor_id", data.vendorId);

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: `Order ${orderId} updated to ${nextStatus.replaceAll("_", " ")}.`,
      });
      await loadOrders();
    } catch (error) {
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
        message: normalizeError(error),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="Loading vendor orders..." />
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
        <EmptyState title="No orders yet" message="Vendor-owned orders will appear here once customers begin ordering." />
      </Card>
    );
  }

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      <Table
        title="Orders"
        headers={["Order ID", "Customer", "Total", "Payment Status", "Order Status", "Created At"]}
        rows={data.orders.map((order) => [
          order.id,
          order.customerName,
          formatCurrency(order.total, intlLocale),
          formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod),
          <OrderStatusBadge key={`${order.id}-status`} status={order.orderStatus} />,
          order.createdAt ? formatDate(order.createdAt, intlLocale) : "-",
        ])}
        emptyMessage="No vendor orders found."
      />

      <section className="detail-grid">
        {data.orders.map((order) => {
          const actions = getNextActions(order.orderStatus);

          return (
            <Card key={order.id} className="medical-panel">
              <div className="inline-actions split-actions">
                <div>
                  <h3 className="order-card-title">{`${t("Order")} ${order.id}`}</h3>
                  <p className="muted order-card-subtitle">
                    {`${t("Customer:")} ${order.customerName}`}
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
                  <strong>{t("Payment Status")}</strong>
                  <span>{formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</span>
                </div>
                <div className="detail-block">
                  <strong>{t("Created")}</strong>
                  <span>{order.createdAt ? formatDate(order.createdAt, intlLocale) : "-"}</span>
                </div>
              </div>

              <Table
                title="Order Items"
                headers={["Product", "Qty", "Unit Price", "Total"]}
                rows={order.items.map((item) => [
                  item.productName,
                  `${item.quantity}`,
                  formatCurrency(item.unitPrice, intlLocale),
                  formatCurrency(item.totalPrice, intlLocale),
                ])}
                emptyMessage="No order items are linked to this order."
              />

              <div className="inline-actions">
                {actions.length === 0 ? <p className="muted">No vendor actions are available for this order.</p> : null}
                {actions.map((action) => (
                  <Button
                    key={`${order.id}-${action.nextStatus}`}
                    className={action.tone === "danger" ? "danger-button" : action.tone === "secondary" ? "secondary-button" : ""}
                    disabled={updatingOrderId === order.id}
                    onClick={() => void updateVendorOrderStatus(order.id, action.nextStatus)}
                  >
                    {updatingOrderId === order.id ? "Updating..." : action.label}
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
