import type { TableModel, UserRow } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function listUsers(): Promise<UserRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, phone")
    .order("created_at", { ascending: false });

  return (data ?? []).map((profile) => ({
    id: String(profile.id),
    full_name: String(profile.full_name),
    role: String(profile.role),
    phone: profile.phone ? String(profile.phone) : null,
    status: "active",
  }));
}

export function getUsersTableModel(users: UserRow[]): TableModel {
  return {
    title: "Users",
    headers: ["Name", "Role", "Phone", "Status"],
    rows: users.map((user) => [user.full_name, user.role, user.phone ?? "-", user.status]),
  };
}
