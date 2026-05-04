import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function VendorSettingsPage() {
  return (
    <DashboardShell title="Store Settings" subtitle="Pharmacy profile, delivery windows, and contact settings." nav={dashboardNavigation.vendor}>
      <PageHeader title="Store Settings" description="Pharmacy profile, delivery windows, and contact settings." />
      <Card>
        <h3>Store Settings</h3>
        <p className="muted">Configure opening hours, order prep timing, and storefront details here.</p>
      </Card>
    </DashboardShell>
  );
}
