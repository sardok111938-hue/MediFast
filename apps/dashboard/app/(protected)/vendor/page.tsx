import { DashboardShell } from "../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../src/components/ui/page-header";
import { StatCard } from "../../../src/components/ui/stat-card";
import { dashboardNavigation } from "../../../src/lib/config/navigation";
import { getVendorStats } from "../../../src/features/dashboard/vendor-stats";

export default function VendorDashboardPage() {
  const stats = getVendorStats();

  return (
    <DashboardShell title="Vendor Panel" subtitle="Realtime pharmacy order management for MediFast partners." nav={dashboardNavigation.vendor}>
      <PageHeader
        badge="Realtime Orders"
        title="Dashboard"
        description="Use Products to manage your catalog. Vendor orders comes next."
      />

      <section className="grid">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>
    </DashboardShell>
  );
}