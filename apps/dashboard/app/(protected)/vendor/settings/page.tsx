import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { EmptyState } from "../../../../src/components/ui/empty-state";
import { ErrorState } from "../../../../src/components/ui/error-state";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { getVendorSettingsData } from "../../../../src/features/vendors/settings";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { VendorSettingsForm } from "./vendor-settings-form";

export default async function VendorSettingsPage() {
  let vendor = null;
  let errorMessage = "";

  try {
    vendor = await getVendorSettingsData();
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Unable to load vendor settings.";
  }

  return (
    <DashboardShell
      title="Store Settings"
      subtitle="Pharmacy profile, branding, and contact settings."
      nav={dashboardNavigation.vendor}
    >
      <PageHeader
        title="Store Settings"
        description="قم بتعديل ملف الصيدلية، معلومات التواصل، العنوان، وصورة واجهة المتجر."
      />

      <Card
  className="medical-panel"
  style={{
    padding: "24px",
    width: "100%",
    maxWidth: "960px",
    marginInlineStart: "auto",
  }}
>
  {errorMessage ? (
    <ErrorState message={errorMessage} />
  ) : !vendor ? (
    <EmptyState title="Vendor not ready" message="This account is not linked to an approved vendor record yet." />
  ) : (
    <VendorSettingsForm vendor={vendor} />
  )}
</Card>
    </DashboardShell>
  );
}
