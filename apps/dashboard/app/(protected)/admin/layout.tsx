import type { ReactNode } from "react";
import { RoleRedirect } from "../../../src/components/auth/role-redirect";
import { LogoutButton } from "../../../src/components/auth/logout-button";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <RoleRedirect role="admin">
      <div>
        <header className="auth-strip">
          <LogoutButton />
        </header>

        {children}
      </div>
    </RoleRedirect>
  );
}
