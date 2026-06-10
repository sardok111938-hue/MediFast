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

type AdminDriversData = {
  drivers: AdminDriverRow[];
};

async function createDriverDocumentSignedUrl(path: string | null | undefined) {
  if (!path) {
    return null;
  }

  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase.storage
    .from("driver-documents")
    .createSignedUrl(path, 60 * 10);

  if (error) {
    return null;
  }

  return data.signedUrl;
}

async function loadAdminDriversData(): Promise<AdminDriversData> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("drivers")
    .select(
      `
      id,
      approval_status,
      is_available,
      current_lat,
      current_lng,
      profile_image_url,
      passport_image_path,
      vehicle_image_path,
      emergency_contact_name,
      emergency_contact_phone,
      vehicle_type,
      vehicle_plate,
      profile:profiles!drivers_user_id_fkey(
      full_name,
      phone
      ),
      current_orders:orders!orders_driver_id_fkey(
        id,
        order_status
        )
    `,
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const drivers = await Promise.all(
    (data ?? []).map(async (driver) => {
      const profile = Array.isArray(driver.profile)
        ? driver.profile[0]
        : driver.profile;

      const currentOrders = Array.isArray(driver.current_orders)
        ? driver.current_orders
        : [];

      const currentOrder =
        currentOrders.find((order) =>
          [
            "assigned",
            "arrived_at_pharmacy",
            "picked_up",
            "on_the_way",
          ].includes(String(order.order_status)),
        ) ?? null;

      return {
        id: String(driver.id),
        fullName: readName(
          driver.profile as
            | { full_name?: string; phone?: string | null }
            | { full_name?: string; phone?: string | null }[]
            | null,
          "السائق",
        ),
        phone: profile?.phone ?? null,
        approvalStatus: String(driver.approval_status),
        isAvailable: Boolean(driver.is_available),
        currentLat:
          driver.current_lat == null ? null : Number(driver.current_lat),
        currentLng:
          driver.current_lng == null ? null : Number(driver.current_lng),
        profileImageUrl: driver.profile_image_url ?? null,
        passportImagePath: driver.passport_image_path ?? null,
        passportImageUrl: await createDriverDocumentSignedUrl(
          driver.passport_image_path,
        ),
        vehicleImagePath: driver.vehicle_image_path ?? null,
        vehicleImageUrl: await createDriverDocumentSignedUrl(
          driver.vehicle_image_path,
        ),
        emergencyContactName: driver.emergency_contact_name ?? null,
        emergencyContactPhone: driver.emergency_contact_phone ?? null,
        vehicleType: driver.vehicle_type ?? null,
        vehiclePlate: driver.vehicle_plate ?? null,
        currentOrderId: currentOrder?.id ? String(currentOrder.id) : null,
        currentOrderStatus: currentOrder?.order_status
          ? String(currentOrder.order_status)
          : null,
      };
    }),
  );

  return {
    drivers,
  };
}

function ReviewImageLink({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (!href) {
    return <span className="muted">{label}: غير مرفق</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="secondary-button"
      style={{
        textDecoration: "none",
        padding: "4px 10px",
        borderRadius: 8,
      }}
    >
      {label}
    </a>
  );
}

function AdminDriversManager() {
  const [state, setState] = useState<AsyncState<AdminDriversData>>({
    data: null,
    error: null,
    loading: true,
  });

  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

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

  async function updateDriverApproval(
    driverId: string,
    approvalStatus: string,
    message: string,
  ) {
    setUpdatingDriverId(driverId);
    setFeedback(null);

    try {
      const result = await adminUpdateDriverAction({
        driverId,
        approvalStatus,
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

  const drivers = state.data?.drivers ?? [];

  return (
    <div className="stack">
      {feedback ? (
        <p className={feedback.type === "error" ? "danger" : "success"}>
          {feedback.message}
        </p>
      ) : null}

      {drivers.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState
            title="لا يوجد سائقون بعد"
            message="لا توجد حسابات سائقين متاحة بعد."
          />
        </Card>
      ) : (
        <Table
          title="السائقون"
          headers={[
            "السائق",
            "الهاتف",
            "الحالة",
            "الطلب الحالي",
            "المركبة",
            "الطوارئ",
            "المستندات",
            "الإجراءات",
          ]}
          rows={drivers.map((driver) => [
            driver.fullName,
            driver.phone ?? "-",
            `${driver.approvalStatus} / ${
              driver.isAvailable ? "متاح" : "غير متاح"
            }`,
            driver.currentOrderId
              ? `${driver.currentOrderStatus ?? "طلب نشط"} / ${driver.currentOrderId.slice(0, 8)}`
              : "لا يوجد",
            `${driver.vehicleType ?? "-"} / ${driver.vehiclePlate ?? "-"}`,
            `${driver.emergencyContactName ?? "-"} / ${
              driver.emergencyContactPhone ?? "-"
            }`,

            <div
              key={`${driver.id}-docs`}
              className="table-actions"
              style={{ gap: 10, alignItems: "center" }}
            >
              <ReviewImageLink
                href={driver.profileImageUrl}
                label="عرض الصورة"
              />
              <ReviewImageLink
                href={driver.passportImageUrl}
                label="عرض الجواز"
              />
              <ReviewImageLink
                href={driver.vehicleImageUrl}
                label="عرض المركبة"
              />
            </div>,

            <div key={`${driver.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={
                  updatingDriverId === driver.id ||
                  driver.approvalStatus === "approved"
                }
                onClick={() =>
                  void updateDriverApproval(
                    driver.id,
                    "approved",
                    `تم اعتماد ${driver.fullName} بنجاح.`,
                  )
                }
              >
                {updatingDriverId === driver.id ? "جارٍ الحفظ..." : "اعتماد"}
              </Button>

              <Button
                className="danger-button"
                disabled={
                  updatingDriverId === driver.id ||
                  driver.approvalStatus === "rejected"
                }
                onClick={() =>
                  void updateDriverApproval(
                    driver.id,
                    "rejected",
                    `تم رفض ${driver.fullName} بنجاح.`,
                  )
                }
              >
                {updatingDriverId === driver.id ? "جارٍ الحفظ..." : "رفض"}
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
