"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { adminUpdateVendorAction } from "../../actions";
import type { AdminVendorRow, AsyncState } from "../shared/admin-types";
import { normalizeError } from "../shared/admin-utils";

async function loadAdminVendorsData(): Promise<AdminVendorRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, approval_status, address_line_1, area, city")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((vendor) => ({
    id: String(vendor.id),
    name: String(vendor.name),
    approvalStatus: String(vendor.approval_status),
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join("، ") || "-",
  }));
}

function AdminVendorsManager() {
  const [state, setState] = useState<AsyncState<AdminVendorRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [updatingVendorId, setUpdatingVendorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminVendorsData();
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
  }, []);

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

  const vendors = state.data ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
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

export function AdminVendorsClient() {
  return <AdminVendorsManager />;
}
