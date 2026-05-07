import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function updateDriverStatus(driverId: string, input: { is_available?: boolean; approval_status?: string }) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("drivers")
    .update(input)
    .eq("id", driverId)
    .select("id, is_available, approval_status")
    .maybeSingle();

  return {
    data: data
      ? {
          id: String(data.id),
          is_available: Boolean(data.is_available),
          approval_status: String(data.approval_status),
        }
      : null,
    error,
  };
}
