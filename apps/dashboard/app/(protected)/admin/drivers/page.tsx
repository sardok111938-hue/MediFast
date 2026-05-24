import Link from "next/link";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import {
  AdminDriversClient,
  AdminMedicalCallout,
} from "../../../../src/features/admin/components/admin-pages";

export default function AdminDriversPage() {
  return (
    <DashboardShell
      title="السائقون"
      subtitle="تغطية التوصيل ومتابعة الجاهزية التشغيلية."
      nav={dashboardNavigation.admin}
    >
      <PageHeader
        title="السائقون"
        description="قراءات سائقي Supabase للموافقات والتوفر وقيم الموقع الحالية."
      >
        <Link href="/admin/assignments" className="button secondary-button">
          فتح مراقبة التوصيل
        </Link>
      </PageHeader>

      <AdminMedicalCallout
        title="السائقون النشطون"
        body="متابعة توفر السائقين وحالة الاعتماد والتوصيل الحالي."
      />

      <AdminDriversClient />
    </DashboardShell>
  );
}