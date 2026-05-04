import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminSettingsPage() {
  return (
    <DashboardShell title="Settings" subtitle="Marketplace-level configuration placeholders." nav={dashboardNavigation.admin}>
      <PageHeader title="Settings" description="Marketplace-level configuration placeholders." />
      <Card>
        <h3>Global Settings</h3>
        <p className="muted">Commission rules, category management, and notification preferences can live here.</p>
      </Card>
    </DashboardShell>
  );
}
