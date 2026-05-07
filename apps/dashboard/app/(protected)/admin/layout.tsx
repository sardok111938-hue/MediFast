import type { ReactNode } from "react";
import { LogoutButton } from "../../../src/components/auth/logout-button";
import { requireDashboardRole } from "../../../src/features/auth/guards";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireDashboardRole("admin");

  return (
    <div>
      <header className="auth-strip">
        <LogoutButton />
      </header>

      {children}
    </div>
  );
}
