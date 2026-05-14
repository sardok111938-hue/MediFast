"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { adminUpdateDriverAction } from "../../actions";
import type { AdminDriverRow, AsyncState } from "../shared/admin-types";
import { normalizeError, readName } from "../shared/admin-utils";

async function loadAdminDriversData(): Promise<AdminDriverRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      approval_status,
      is_available,
      current_lat,
      current_lng,
      profile:profiles!drivers_user_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((driver) => ({
    id: String(driver.id),
    fullName: readName(driver.profile as { full_name?: string } | { full_name?: string }[] | null, "السائق"),
    approvalStatus: String(driver.approval_status),
    isAvailable: Boolean(driver.is_available),
    currentLat: driver.current_lat == null ? null : Number(driver.current_lat),
    currentLng: driver.current_lng == null ? null : Number(driver.current_lng),
  }));
}

function AdminDriversManager() {
  const [state, setState] = useState<AsyncState<AdminDriverRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminDriversData();
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

  async function updateDriver(driverId: string, updates: { approval_status?: string; is_available?: boolean }, message: string) {
    setUpdatingDriverId(driverId);
    setFeedback(null);

    try {
      const result = await adminUpdateDriverAction({
        driverId,
        approvalStatus: updates.approval_status,
        isAvailable: updates.is_available,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث السائق.");
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
      setUpdatingDriverId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل السائقين من Supabase..." />
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

  const drivers = state.data ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      {drivers.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا يوجد سائقون بعد" message="لا توجد حسابات سائقين متاحة بعد." />
        </Card>
      ) : (
        <Table
          title="السائقون"
          headers={["السائق", "الموافقة", "التوفر", "الموقع", "الإجراءات"]}
          rows={drivers.map((driver) => [
            driver.fullName,
            driver.approvalStatus,
            driver.isAvailable ? "نشط" : "غير نشط",
            `${driver.currentLat ?? "-"}, ${driver.currentLng ?? "-"}`,
            <div key={`${driver.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "approved" },
                    `تم اعتماد ${driver.fullName} بنجاح.`
                  )
                }
              >
                اعتماد
              </Button>
              <Button
                className="danger-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "rejected" },
                    `تم رفض ${driver.fullName} بنجاح.`
                  )
                }
              >
                رفض
              </Button>
              <Button
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { is_available: !driver.isAvailable },
                    `${driver.isAvailable ? "تم تعطيل" : "تم تفعيل"} ${driver.fullName} بنجاح.`
                  )
                }
              >
                {updatingDriverId === driver.id ? "جارٍ الحفظ..." : driver.isAvailable ? "تعطيل" : "تفعيل"}
              </Button>
            </div>,
          ])}
          emptyMessage="لا توجد حسابات سائقين متاحة بعد."
        />
      )}
    </div>
  );
}

export function AdminDriversClient() {
  return <AdminDriversManager />;
}
