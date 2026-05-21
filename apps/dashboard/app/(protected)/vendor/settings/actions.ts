"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../../../src/lib/supabase/server";

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (Number.isNaN(parsed)) {
    throw new Error("يجب إدخال الإحداثيات ونطاق التوصيل كأرقام صحيحة.");
  }

  return parsed;
}

export async function vendorUpdateSettingsAction(input: {
  name: string;
  description: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;
  imageUrl: string;
  lat: string;
  lng: string;
  deliveryRadiusKm: string;
}) {
  try {
    const supabase = await getSupabaseServerClient();

    const { error } = await supabase.rpc("vendor_update_settings", {
      p_name: input.name,
      p_description: input.description || null,
      p_phone: input.phone || null,
      p_address_line_1: input.addressLine1 || null,
      p_city: input.city || null,
      p_area: input.area || null,
      p_image_url: input.imageUrl || null,
      p_lat: parseOptionalNumber(input.lat),
      p_lng: parseOptionalNumber(input.lng),
      p_delivery_radius_km: parseOptionalNumber(input.deliveryRadiusKm) ?? 20,
    });

    if (error) {
      return {
        success: false,
        error: error.message,
      };
    }

    revalidatePath("/vendor/settings");
    revalidatePath("/vendor");

    return {
      success: true,
      error: null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "تعذر حفظ إعدادات المتجر.",
    };
  }
}