import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function getVendorById(vendorId: string) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, user_id, name, address_line_1, city, area, approval_status, is_active")
    .eq("id", vendorId)
    .maybeSingle();

  return {
    data: data
      ? {
          id: String(data.id),
          user_id: data.user_id ? String(data.user_id) : null,
          name: String(data.name),
          address: [data.address_line_1, data.area, data.city].filter(Boolean).join(", "),
          approval_status: String(data.approval_status),
          is_open: Boolean(data.is_active),
        }
      : null,
    error,
  };
}
