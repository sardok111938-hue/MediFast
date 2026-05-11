import type { DriverRow, TableModel } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";

type DriverProfile = { full_name?: string } | { full_name?: string }[] | null | undefined;

function readDriverName(profile: DriverProfile) {
  if (Array.isArray(profile)) {
    return profile[0]?.full_name ?? "Driver";
  }

  return profile?.full_name ?? "Driver";
}

export async function listDrivers(): Promise<DriverRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      user_id,
      is_available,
      approval_status,
      current_lat,
      current_lng,
      profile:profiles(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((driver) => ({
    id: String(driver.id),
    user_id: String(driver.user_id),
    full_name: readDriverName(driver.profile as DriverProfile),
    is_available: Boolean(driver.is_available),
    approval_status: String(driver.approval_status),
    current_lat: driver.current_lat == null ? null : Number(driver.current_lat),
    current_lng: driver.current_lng == null ? null : Number(driver.current_lng),
  }));
}

export async function listAvailableApprovedDrivers(): Promise<DriverRow[]> {
  const drivers = await listDrivers();
  return drivers.filter((driver) => driver.is_available && driver.approval_status === "approved");
}

export function getDriversTableModel(drivers: DriverRow[]): TableModel {
  return {
    title: "Drivers",
    headers: ["Driver", "Available", "Approval", "Location"],
    rows: drivers.map((driver) => [
      driver.full_name,
      driver.is_available ? "Yes" : "No",
      driver.approval_status,
      `${driver.current_lat ?? "-"}, ${driver.current_lng ?? "-"}`,
    ]),
  };
}
