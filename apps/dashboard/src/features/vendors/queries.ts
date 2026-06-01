import type { TableModel, VendorRow } from "../../types/dashboard";
import { buildPaginatedResult, DEFAULT_PAGE_SIZE, getPaginationRange, type PaginatedResult, type PaginationInput } from "../../lib/pagination";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function listVendors(input: PaginationInput = {}): Promise<PaginatedResult<VendorRow>> {
  const supabase = await getSupabaseServerClient();
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? DEFAULT_PAGE_SIZE;
  const { from, to } = getPaginationRange(page, pageSize);
  const { data, count } = await supabase
    .from("vendors")
    .select("id, user_id, name, address_line_1, city, area, approval_status, is_active", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  const rows = (data ?? []).map((vendor) => ({
    id: String(vendor.id),
    user_id: vendor.user_id ? String(vendor.user_id) : null,
    name: String(vendor.name),
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join(", "),
    rating: "-",
    approval_status: String(vendor.approval_status),
    is_open: Boolean(vendor.is_active),
  }));

  return buildPaginatedResult(rows, count, { page, pageSize });
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
