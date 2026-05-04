import { getSupabaseBrowserClient } from "../../lib/supabase/browser";

export function subscribeToVendorOrders(vendorId: string, onChange: (payload: unknown) => void) {
  const supabase = getSupabaseBrowserClient();
  return supabase
    .channel(`vendor-orders-${vendorId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "orders", filter: `vendor_id=eq.${vendorId}` },
      onChange
    )
    .subscribe();
}
