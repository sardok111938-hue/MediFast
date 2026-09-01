"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { buildPaginatedResult, DEFAULT_PAGE_SIZE, getPaginationRange, type PaginatedResult } from "../../../../lib/pagination";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { adminUpdateVendorAction } from "../../actions";
import type { AdminVendorRow, AsyncState } from "../shared/admin-types";
import { normalizeError } from "../shared/admin-utils";

type AdminVendorsData = PaginatedResult<AdminVendorRow>;

async function loadAdminVendorsData(page: number): Promise<AdminVendorsData> {
  const supabase = getSupabaseBrowserClient();
  const { from, to } = getPaginationRange(page, DEFAULT_PAGE_SIZE);
  const { data, error, count } = await supabase
    .from("vendors")
    .select("id, name, vendor_type, approval_status, address_line_1, area, city", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (error) {
    throw error;
  }

  const rows = (data ?? []).map((vendor) => ({
    id: String(vendor.id),
    name: String(vendor.name),
    vendorType: String(vendor.vendor_type),
    approvalStatus: String(vendor.approval_status),
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join("، ") || "-",
  }));

  return buildPaginatedResult(rows, count, { page, pageSize: DEFAULT_PAGE_SIZE });
}

function AdminVendorsManager() {
  const [state, setState] = useState<AsyncState<AdminVendorsData>>({
    data: null,
    error: null,
    loading: true,
  });
  const [page, setPage] = useState(1);
  const [updatingVendorId, setUpdatingVendorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminVendorsData(page);
      setState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  useEffect(() => {
    void load();
  }, [page]);

  async function updateVendor(vendorId: string, approvalStatus: "approved" | "rejected", message: string) {
    setUpdatingVendorId(vendorId);
    setFeedback(null);

    try {
      const result = await adminUpdateVendorAction({
        vendorId,
        approvalStatus,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث المتجر.");
      }

      setFeedback({
        type: "success",
        message,
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingVendorId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل المتاجر من Supabase..." />
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

  const vendors = state.data?.rows ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      <PaginationControls
        totalCount={state.data?.totalCount ?? 0}
        page={state.data?.page ?? page}
        pageCount={state.data?.pageCount ?? 1}
        onPrevious={() => setPage((current) => Math.max(1, current - 1))}
        onNext={() => setPage((current) => Math.min(state.data?.pageCount ?? current, current + 1))}
      />
      {vendors.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد متاجر بعد" message="لم تتم إضافة أي شركاء صيدليات بعد." />
        </Card>
      ) : (
        <Table
          title="المتاجر"
          headers={["الاسم", "العنوان", "الموافقة", "الإجراءات"]}
          rows={vendors.map((vendor) => [
            vendor.name,
            vendor.address,
            vendor.approvalStatus,
            <div key={`${vendor.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    "approved",
                    `تم اعتماد ${vendor.name} وتفعيله بنجاح.`
                  )
                }
              >
                اعتماد
              </Button>
              <Button
                className="danger-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    "rejected",
                    `تم رفض ${vendor.name} وتعطيله بنجاح.`
                  )
                }
              >
                رفض
              </Button>
            </div>,
          ])}
          emptyMessage="لم تتم إضافة أي متاجر بعد."
        />
      )}
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

export function AdminVendorsClient() {
  return <AdminVendorsManager />;
}
