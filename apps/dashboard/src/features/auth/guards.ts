import { redirect } from "next/navigation";
import type { Route } from "next";
import { ROUTES } from "../../lib/config/routes";
import { isRole } from "../../lib/utils/guards";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export type DashboardRole = "admin" | "driver" | "vendor";

type DashboardProfile = {
  id: string;
  role: string;
  full_name: string;
};

const roleRoutes: Record<DashboardRole, Route> = {
  admin: ROUTES.admin as Route,
  driver: ROUTES.driver as Route,
  vendor: ROUTES.vendor as Route,
};

function isDashboardRole(role: string | null | undefined): role is DashboardRole {
  return role === "admin" || role === "driver" || role === "vendor";
}

export function getDashboardRouteForRole(role: DashboardRole): Route {
  return roleRoutes[role];
}

export async function getCurrentSessionUserServer() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user ?? null;
}

export async function getCurrentProfileServer(authUserId: string): Promise<DashboardProfile | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: String(data.id),
    role: String(data.role),
    full_name: String(data.full_name),
  };
}

export async function requireDashboardRole(expectedRole: DashboardRole) {
  const user = await getCurrentSessionUserServer();

  if (!user) {
    redirect(ROUTES.login);
  }

  const profile = await getCurrentProfileServer(user.id);

  if (!isRole(profile?.role, expectedRole)) {
    if (isDashboardRole(profile?.role)) {
      redirect(roleRoutes[profile.role]);
    }

    redirect(ROUTES.login);
  }

  return {
    user,
    profile,
  };
}

export async function getAuthenticatedDashboardRedirect() {
  const user = await getCurrentSessionUserServer();

  if (!user) {
    return null;
  }

  const profile = await getCurrentProfileServer(user.id);

  if (!isDashboardRole(profile?.role)) {
    return {
      user,
      profile,
      route: null,
    };
  }

  return {
    user,
    profile,
    route: getDashboardRouteForRole(profile.role),
  };
}
