import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { AdminDriversClient, AdminMedicalCallout } from "../../../../src/features/admin/components/admin-pages";

export default function AdminDriversPage() {
  return (
    <DashboardShell title="Drivers" subtitle="Courier coverage with a calm medical operations feel." nav={dashboardNavigation.admin}>
      <PageHeader title="Drivers" description="Supabase-backed driver reads for approvals, availability, and current location values." />
      <AdminMedicalCallout
        title="Dispatch visibility"
        body="This simple table keeps driver availability and approval status easy to scan before any future dispatch tooling is added."
      />
      <AdminDriversClient />
    </DashboardShell>
  );
}
