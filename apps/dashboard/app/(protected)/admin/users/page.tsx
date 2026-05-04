import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { Table } from "../../../../src/components/ui/table";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { getUsersTableModel, listUsers } from "../../../../src/features/users/queries";

export default async function AdminUsersPage() {
  const users = await listUsers();
  const table = getUsersTableModel(users);

  return (
    <DashboardShell title="Users" subtitle="Customer account monitoring and support view." nav={dashboardNavigation.admin}>
      <PageHeader title="Users" description="Customer account monitoring and support view." />
      <Table title={table.title} headers={table.headers} rows={table.rows} />
    </DashboardShell>
  );
}
