"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../../lib/config/routes";
import { signOutDashboardUser } from "../../features/auth/api";
import { getCurrentProfileClient, getCurrentSessionUserClient } from "../../features/auth/queries";
import { isRole } from "../../lib/utils/guards";
import { LoadingState } from "../ui/loading-state";

export function RoleRedirect({
  role,
  children,
}: {
  role: "admin" | "driver" | "vendor";
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const user = await getCurrentSessionUserClient();

      if (!user) {
        router.replace(ROUTES.login);
        return;
      }

      const profile = await getCurrentProfileClient(user.id);

      if (!isRole(profile?.role, role)) {
        await signOutDashboardUser();
        router.replace(ROUTES.login);
        return;
      }

      if (!cancelled) {
        setStatus("ready");
      }
    }

    void verify();

    return () => {
      cancelled = true;
    };
  }, [role, router]);

  if (status === "loading") {
    return <LoadingState message="Checking access..." />;
  }

  return <>{children}</>;
}
