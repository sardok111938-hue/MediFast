import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";

export default function AdminSettingsPage() {
  return (
    <DashboardShell title="الإعدادات" subtitle="إعدادات عامة لسوق ميدي فاست." nav={dashboardNavigation.admin}>
      <PageHeader title="الإعدادات" description="مساحة إعدادات عامة للسوق والتنبيهات والتشغيل." />
      <Card>
        <h3>إعدادات عامة</h3>
        <p className="muted">يمكن وضع قواعد العمولة وإدارة الفئات وتفضيلات التنبيهات هنا.</p>
      </Card>
    </DashboardShell>
  );
}
