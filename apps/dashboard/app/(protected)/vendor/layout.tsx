import type { ReactNode } from "react";
import { LogoutButton } from "../../../src/components/auth/logout-button";
import { requireDashboardRole } from "../../../src/features/auth/guards";

export default async function VendorLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireDashboardRole("vendor");

  return (
    <div>
      <header className="auth-strip auth-strip-end">
        <LogoutButton />
      </header>

      {children}
    </div>
  );
}