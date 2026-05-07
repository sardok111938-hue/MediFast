import type { TableModel, VendorRow } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function listVendors(): Promise<VendorRow[]> {
  const supabase = await getSupabaseServerClient();
  const { data } = await supabase
    .from("vendors")
    .select("id, user_id, name, address_line_1, city, area, approval_status, is_active")
    .order("created_at", { ascending: false });

  return (data ?? []).map((vendor) => ({
    id: String(vendor.id),
    user_id: vendor.user_id ? String(vendor.user_id) : null,
    name: String(vendor.name),
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join(", "),
    rating: "-",
    approval_status: String(vendor.approval_status),
    is_open: Boolean(vendor.is_active),
  }));
}

export function getVendorsTableModel(vendors: VendorRow[]): TableModel {
  return {
    title: "Vendors",
    headers: ["Name", "Address", "Approval", "Status"],
    rows: vendors.map((vendor) => [
      vendor.name,
      vendor.address,
      vendor.approval_status,
      vendor.is_open ? "Open" : "Closed",
    ]),
  };
}
