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

type VendorSettlementRow = {
  id: string;
  period_start: string;
  period_end: string;
  gross_sales: number;
  commission_rate: number;
  commission_amount: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
  notes: string | null;
  vendor: { name: string | null } | { name: string | null }[] | null;
};
async function markSettlementPaid(formData: FormData) {
  "use server";

  const settlementId = String(formData.get("settlementId") ?? "");
  const supabase = await getSupabaseServerClient();

  if (!settlementId) {
    throw new Error("Missing settlement id.");
  }

  const { error } = await supabase.rpc("admin_mark_vendor_settlement_paid", {
    p_settlement_id: settlementId,
    p_notes: "Marked paid from admin dashboard.",
  });

  if (error) {
    throw error;
  }

  revalidatePath("/admin/settlements");
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

export default async function AdminVendorSettlementsPage() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("vendor_settlements")
    .select(`
      id,
      period_start,
      period_end,
      gross_sales,
      commission_rate,
      commission_amount,
      net_amount,
      status,
      paid_at,
      notes,
      vendor:vendors(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  const settlements = (data ?? []) as VendorSettlementRow[];

  return (
    <DashboardShell
      title="تسويات الصيدليات"
      subtitle="مراجعة مبيعات الصيدليات والعمولات وصافي المستحقات."
      nav={dashboardNavigation.admin}
    >
      <PageHeader
        title="تسويات الصيدليات"
        description="تابع إجمالي المبيعات، عمولة المنصة، وصافي المبلغ المستحق لكل صيدلية."
      />

      <AdminMedicalCallout
        title="متابعة المستحقات"
        body="تعرض هذه الصفحة التسويات التي تم إنشاؤها للصيدليات، ويمكن للمدير تعليم التسوية كمدفوعة بعد إتمام الدفع خارج النظام."
      />

      {settlements.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد تسويات بعد" message="أنشئ تسوية لصيدلية أولًا حتى تظهر هنا." />
        </Card>
      ) : (
        <Table
          title="قائمة التسويات"
          headers={["الصيدلية", "الفترة", "الإجمالي", "العمولة", "الصافي", "الحالة", "تاريخ الدفع", "الإجراء"]}
          rows={settlements.map((settlement) => [
            readSingle(settlement.vendor)?.name ?? "صيدلية غير محددة",
            `${formatDate(settlement.period_start)} - ${formatDate(settlement.period_end)}`,
            formatCurrency(Number(settlement.gross_sales ?? 0), "en-GB"),
            `${formatCurrency(Number(settlement.commission_amount ?? 0), "en-GB")} (${Number(
              settlement.commission_rate ?? 0
            )}%)`,
            formatCurrency(Number(settlement.net_amount ?? 0), "en-GB"),
            formatStatus(settlement.status),
            formatDate(settlement.paid_at),
            settlement.status === "paid" ? (
              <span key={`${settlement.id}-paid`} className="pill status-delivered">
                تم الدفع
              </span>
            ) : (
              <form key={`${settlement.id}-form`} action={markSettlementPaid}>
                <input type="hidden" name="settlementId" value={settlement.id} />
                <button type="submit" className="button secondary-button">
                  Mark Paid
                </button>
              </form>
            ),
          ])}
          emptyMessage="لا توجد تسويات بعد."
        />
      )}
    </DashboardShell>
  );
}
