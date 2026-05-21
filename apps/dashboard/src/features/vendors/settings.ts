import { getSupabaseServerClient } from "../../lib/supabase/server";

export type VendorSettingsData = {
  id: string;
  name: string;
  description: string;
  phone: string;
  address_line_1: string;
  city: string;
  area: string;
  image_url: string;
  lat: string;
  lng: string;
  delivery_radius_km: string;
};

export async function getVendorSettingsData(): Promise<VendorSettingsData | null> {
  const supabase = await getSupabaseServerClient();

  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    return null;
  }

  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, description, phone, address_line_1, city, area, image_url, lat, lng, delivery_radius_km")
    .eq("id", vendorId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return {
    id: String(data.id),
    name: String(data.name ?? ""),
    description: String(data.description ?? ""),
    phone: String(data.phone ?? ""),
    address_line_1: String(data.address_line_1 ?? ""),
    city: String(data.city ?? ""),
    area: String(data.area ?? ""),
    image_url: String(data.image_url ?? ""),
    lat: data.lat == null ? "" : String(data.lat),
    lng: data.lng == null ? "" : String(data.lng),
    delivery_radius_km: data.delivery_radius_km == null ? "20" : String(data.delivery_radius_km),
  };
}