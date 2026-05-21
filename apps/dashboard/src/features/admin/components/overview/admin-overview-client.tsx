"use client";

import { useEffect, useState } from "react";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { StatCard } from "../../../../components/ui/stat-card";
import { Table } from "../../../../components/ui/table";
import { useLocale } from "../../../../lib/i18n/locale-context";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { formatCurrency } from "../../../../lib/utils/format-currency";
import { OrderStatusBadge } from "../../../orders/components/order-status-badge";
import type { AsyncState, OverviewData } from "../shared/admin-types";
import { fetchCount, normalizeError, readCategoryName, readName, readSingle } from "../shared/admin-utils";
import { formatOrderNumber, formatPaymentStatusLabel } from "@medifast/types";

async function loadOverviewData(): Promise<OverviewData> {
  const supabase = getSupabaseBrowserClient();
  const [vendorsCount, driversCount, customersCount, productsCount, categoriesCount, ordersCount, ordersResult, productsResult] =
    await Promise.all([
      fetchCount("vendors"),
      fetchCount("drivers"),
      fetchCount("customers"),
      fetchCount("products"),
      fetchCount("categories"),
      fetchCount("orders"),
      supabase
        .from("orders")
        .select(`
          id,
          order_status,
          total,
          created_at,
          vendor:vendors(name),
          customer:customers(
            profile:profiles(full_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          stock_quantity,
          is_active,
          category:categories(name, name_ar)
        `)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  return {
    stats: [
      { label: "المتاجر", value: `${vendorsCount}`, hint: "شركاء الصيدليات النشطون في السوق" },
      { label: "السائقون", value: `${driversCount}`, hint: "حسابات التوصيل المتاحة للتشغيل" },
      { label: "العملاء", value: `${customersCount}`, hint: "ملفات جاهزة لطلبات متكررة" },
      { label: "المنتجات", value: `${productsCount}`, hint: "عناصر الكتالوج المتزامنة من Supabase" },
      { label: "الفئات", value: `${categoriesCount}`, hint: "حالة تنظيم الكتالوج" },
      { label: "الطلبات", value: `${ordersCount}`, hint: "إجمالي سجلات الطلبات المتعقبة" },
    ],
    ordersTable: {
      title: "أحدث الطلبات",
      headers: ["الطلب", "العميل", "المتجر", "الحالة"],
      rows: (ordersResult.data ?? []).map((order) => [
        formatOrderNumber(String(order.id)),
        readName((readSingle(order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile), "العميل"),
        readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null),
        <OrderStatusBadge key={`overview-order-${order.id}`} status={String(order.order_status)} />,
      ]),
    },
    productsTable: {
      title: "أحدث المنتجات",
      headers: ["المنتج", "الفئة", "السعر", "المخزون"],
      rows: (productsResult.data ?? []).map((product) => [
        String(product.name),
        readCategoryName(product.category as { name?: string } | { name?: string }[] | null),
        formatCurrency(Number(product.price ?? 0)),
        `${Number(product.stock_quantity ?? 0)}`,
      ]),
    },
  };
}

function OverviewContent() {
  const { t } = useLocale();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AsyncState<OverviewData>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState({
        data: null,
        error: null,
        loading: true,
      });

      try {
        const data = await loadOverviewData();

        if (!active) {
          return;
        }

        setState({
          data,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          error: normalizeError(error),
          loading: false,
        });
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل نظرة الإدارة العامة..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => setReloadKey((value) => value + 1)} />
      </Card>
    );
  }

  if (!state.data) {
    return (
      <Card className="medical-panel">
        <EmptyState title="لا توجد بيانات عامة" message="لم تُرجع Supabase مؤشرات النظرة العامة." />
      </Card>
    );
  }

  return (
    <>
      <section className="grid medical-grid">
        {state.data.stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>
      <div className="overview-tables">
        <Table
          title={state.data.ordersTable.title}
          headers={state.data.ordersTable.headers}
          rows={state.data.ordersTable.rows}
          emptyMessage={t("No recent orders are available yet.")}
        />
        <Table
          title={state.data.productsTable.title}
          headers={state.data.productsTable.headers}
          rows={state.data.productsTable.rows}
          emptyMessage={t("No recent products are available yet.")}
        />
      </div>
    </>
  );
}

export function AdminOverviewClient() {
  return <OverviewContent />;
}
