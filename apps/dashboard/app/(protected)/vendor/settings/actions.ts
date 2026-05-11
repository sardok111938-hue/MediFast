"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../../../src/lib/supabase/server";

export async function vendorUpdateSettingsAction(input: {
  name: string;
  description: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;
  imageUrl: string;
}) {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.rpc("vendor_update_settings", {
    p_name: input.name,
    p_description: input.description || null,
    p_phone: input.phone || null,
    p_address_line_1: input.addressLine1 || null,
    p_city: input.city || null,
    p_area: input.area || null,
    p_image_url: input.imageUrl || null,
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
}