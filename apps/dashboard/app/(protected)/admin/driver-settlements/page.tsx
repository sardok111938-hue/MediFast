import { revalidatePath } from "next/cache";
import { readSingle } from "../../../../src/features/admin/components/shared/admin-utils";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { getSupabaseServerClient } from "../../../../src/lib/supabase/server";
import { formatCurrency } from "../../../../src/lib/utils/format-currency";

type DriverOption = {
  id: string;
  user_id: string | null;
  approval_status: string | null;
  profile:
    | {
        full_name: string | null;
        phone: string | null;
      }
    | {
        full_name: string | null;
        phone: string | null;
      }[]
    | null;
};

type DriverSettlementRow = {
  id: string;
  period_start: string;
  period_end: string;
  orders_count: number;
  payout_per_order: number;
  gross_payout: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  driver:
    | {
        id: string;
        profile:
          | {
              full_name: string | null;
              phone: string | null;
            }
          | {
              full_name: string | null;
              phone: string | null;
            }[]
          | null;
      }
    | {
        id: string;
        profile:
          | {
              full_name: string | null;
              phone: string | null;
            }
          | {
              full_name: string | null;
              phone: string | null;
            }[]
          | null;
      }[]
    | null;
};

async function generateDriverSettlement(formData: FormData) {
  "use server";

  const driverId = String(formData.get("driverId") ?? "");
  const periodStart = String(formData.get("periodStart") ?? "");
  const periodEnd = String(formData.get("periodEnd") ?? "");
  const payoutPerOrder = Number(formData.get("payoutPerOrder") ?? 5);

  if (!driverId || !periodStart || !periodEnd) {
    throw new Error("Missing driver settlement details.");
  }

  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("admin_create_driver_settlement", {
    p_driver_id: driverId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
    p_payout_per_order: payoutPerOrder,
  });

  if (error) {
    throw error;
  }

  revalidatePath("/admin/driver-settlements");
}

async function markDriverSettlementPaid(formData: FormData) {
  "use server";

  const settlementId = String(formData.get("settlementId") ?? "");
  const supabase = await getSupabaseServerClient();

  if (!settlementId) {
    throw new Error("Missing driver settlement id.");
  }

  const { error } = await supabase.rpc("admin_mark_driver_settlement_paid", {
    p_settlement_id: settlementId,
    p_notes: "تم تسجيل دفع السائق من لوحة الإدارة",
  });

  if (error) {
    throw error;
  }

  revalidatePath("/admin/driver-settlements");
}

function formatDate(value: string | null) {
  if (!value) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function formatStatus(status: string) {
  switch (status) {
    case "paid":
      return "مدفوع";
    case "cancelled":
      return "ملغي";
    case "pending":
    default:
      return "معلق";
  }
}

function getDriverLabel(driver: DriverOption) {
  const profile = readSingle(driver.profile);
  const name = profile?.full_name ?? "سائق بدون اسم";
  const phone = profile?.phone;

  return phone ? `${name} • ${phone}` : name;
}

function getSettlementDriverLabel(settlement: DriverSettlementRow) {
  const driver = readSingle(settlement.driver);
  const profile = readSingle(driver?.profile ?? null);
  const name = profile?.full_name ?? "سائق غير محدد";
  const phone = profile?.phone;

  return phone ? `${name} • ${phone}` : name;
}

export default async function AdminDriverSettlementsPage() {
  const supabase = await getSupabaseServerClient();

  const [{ data, error }, { data: driversData, error: driversError }] = await Promise.all([
    supabase
      .from("driver_settlements")
      .select(`
        id,
        period_start,
        period_end,
        orders_count,
        payout_per_order,
        gross_payout,
        status,
        paid_at,
        notes,
        driver:drivers(
          id,
          profile:profiles(
            full_name,
            phone
          )
        )
      `)
      .order("created_at", { ascending: false }),
    supabase
      .from("drivers")
      .select(`
        id,
        user_id,
        approval_status,
        profile:profiles(
          full_name,
          phone
        )
      `)
      .eq("approval_status", "approved")
      .order("created_at", { ascending: false }),
  ]);

  if (error) {
    throw error;
  }

  if (driversError) {
    throw driversError;
  }

  const settlements = (data ?? []) as DriverSettlementRow[];
  const drivers = (driversData ?? []) as DriverOption[];

  return (
    <DashboardShell
      title="تسويات السائقين"
      subtitle="مراجعة عدد التوصيلات ومبالغ مستحقات السائقين."
      nav={dashboardNavigation.admin}
    >
      <PageHeader
        title="تسويات السائقين"
        description="أنشئ تسوية لكل سائق حسب عدد الطلبات المسلمة والمدفوعة خلال فترة محددة."
      />

      <AdminMedicalCallout
        title="مستحقات السائقين"
        body="يتم حساب مستحقات السائقين بناءً على الطلبات المسلمة والمدفوعة فقط. السعر الافتراضي الحالي هو 5 LYD لكل طلب مكتمل."
      />

      <Card className="medical-panel">
        <div className="section-heading">
          <h3 className="order-card-title">إنشاء تسوية سائق</h3>
          <p className="muted order-card-subtitle">
            اختر السائق والفترة. سيتم حساب عدد الطلبات المسلمة والمدفوعة وإجمالي المبلغ المستحق.
          </p>
        </div>

        <form action={generateDriverSettlement} className="form-grid">
          <label>
            السائق
            <select name="driverId" required>
              <option value="">اختر السائق</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {getDriverLabel(driver)}
                </option>
              ))}
            </select>
          </label>

          <label>
            بداية الفترة
            <input name="periodStart" type="date" required />
          </label>

          <label>
            نهاية الفترة
            <input name="periodEnd" type="date" required />
          </label>

          <label>
            قيمة التوصيل للسائق
            <input name="payoutPerOrder" type="number" min="0" step="0.01" defaultValue="5" required />
          </label>

          <div className="inline-actions">
            <button type="submit" className="button">
              إنشاء تسوية السائق
            </button>
          </div>
        </form>
      </Card>

      {settlements.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد تسويات للسائقين بعد" message="أنشئ تسوية لسائق أولًا حتى تظهر هنا." />
        </Card>
      ) : (
        <Table
          title="قائمة تسويات السائقين"
          headers={[
            "السائق",
            "الفترة",
            "عدد الطلبات",
            "قيمة الطلب",
            "الإجمالي",
            "الحالة",
            "تاريخ الدفع",
            "الإجراء",
          ]}
          rows={settlements.map((settlement) => [
            getSettlementDriverLabel(settlement),
            `${formatDate(settlement.period_start)} - ${formatDate(settlement.period_end)}`,
            Number(settlement.orders_count ?? 0).toLocaleString("en-GB"),
            formatCurrency(Number(settlement.payout_per_order ?? 0), "en-GB"),
            formatCurrency(Number(settlement.gross_payout ?? 0), "en-GB"),
            formatStatus(settlement.status),
            formatDate(settlement.paid_at),
            settlement.status === "paid" ? (
              <span key={`${settlement.id}-paid`} className="pill status-delivered">
                تم الدفع
              </span>
            ) : (
              <form key={`${settlement.id}-form`} action={markDriverSettlementPaid}>
                <input type="hidden" name="settlementId" value={settlement.id} />
                <button type="submit" className="button secondary-button">
                  تحديد كمدفوع
                </button>
              </form>
            ),
          ])}
          emptyMessage="لا توجد تسويات للسائقين بعد."
        />
      )}
    </DashboardShell>
  );
}