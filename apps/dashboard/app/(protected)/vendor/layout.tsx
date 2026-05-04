import type { ReactNode } from "react";
import { RoleRedirect } from "../../../src/components/auth/role-redirect";
import { LogoutButton } from "../../../src/components/auth/logout-button";

export default function VendorLayout({ children }: { children: ReactNode }) {
  return (
    <RoleRedirect role="vendor">
      <div>
        <header className="auth-strip auth-strip-end">
          <LogoutButton />
        </header>

        {children}
      </div>
    </RoleRedirect>
  );
}
