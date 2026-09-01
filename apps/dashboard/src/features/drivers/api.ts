import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function updateDriverStatus(
  driverId: string,
  input: { is_available?: boolean; approval_status?: string }
) {
  const supabase = await getSupabaseServerClient();

  const { error: updateError } = await supabase.rpc("admin_update_driver", {
    p_driver_id: driverId,
    p_approval_status: input.approval_status ?? null,
    p_is_available: input.is_available ?? null,
  });

  if (updateError) {
    return {
      data: null,
      error: updateError,
    };
  }

  const { data, error } = await supabase
    .from("drivers")
    .select("id, is_available, approval_status")
    .eq("id", driverId)
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
