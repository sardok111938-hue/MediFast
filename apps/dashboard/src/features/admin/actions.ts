"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";

type AdminActionResult = {
  success: boolean;
  error: string | null;
};

async function callAdminRpc<TParams extends Record<string, unknown>>(
  fn: string,
  params: TParams
): Promise<AdminActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc(fn, params);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    error: null,
  };
}

export async function adminUpdateVendorAction(input: {
  vendorId: string;
  approvalStatus?: string;
  isActive?: boolean;
}): Promise<AdminActionResult> {
  const managedIsActive =
    input.approvalStatus === "approved"
      ? true
      : input.approvalStatus === "rejected"
        ? false
        : input.isActive;

  const result = await callAdminRpc("admin_update_vendor", {
    p_vendor_id: input.vendorId,
    p_approval_status: input.approvalStatus ?? null,
    p_is_active: managedIsActive ?? null,
  });

  if (result.success) {
    revalidatePath("/admin/vendors");
  }

  return result;
}

export async function adminUpdateDriverAction(input: {
  driverId: string;
  approvalStatus?: string;
  isAvailable?: boolean;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_update_driver", {
    p_driver_id: input.driverId,
    p_approval_status: input.approvalStatus ?? null,
    p_is_available: input.isAvailable ?? null,
  });

  if (result.success) {
    revalidatePath("/admin/drivers");
  }

  return result;
}

export async function adminCreateCategoryAction(input: {
  name: string;
  nameAr: string | null;
  slug?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_create_category", {
    p_name: input.name,
    p_name_ar: input.nameAr,
    p_slug: input.slug ?? null,
    p_icon: input.icon ?? null,
    p_image_url: input.imageUrl ?? null,
    p_sort_order: input.sortOrder ?? 0,
    p_is_active: input.isActive ?? true,
    p_parent_id: input.parentId ?? null,
  });

  if (result.success) {
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }

  return result;
}

export async function adminUpdateCategoryAction(input: {
  categoryId: string;
  name: string;
  nameAr: string | null;
  slug?: string | null;
  icon?: string | null;
  imageUrl?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  parentId?: string | null;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_update_category", {
    p_category_id: input.categoryId,
    p_name: input.name,
    p_name_ar: input.nameAr,
    p_slug: input.slug ?? null,
    p_icon: input.icon ?? null,
    p_image_url: input.imageUrl ?? null,
    p_sort_order: input.sortOrder ?? 0,
    p_is_active: input.isActive ?? true,
    p_parent_id: input.parentId ?? null,
  });

  if (result.success) {
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }

  return result;
}

export async function adminDeleteCategoryAction(input: {
  categoryId: string;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_delete_category", {
    p_category_id: input.categoryId,
  });

  if (result.success) {
    revalidatePath("/admin/categories");
    revalidatePath("/admin/products");
  }

  return result;
}

export async function adminCreateProductAction(input: {
  vendorId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_create_product", {
    p_vendor_id: input.vendorId,
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_category_id: input.categoryId,
    p_image_url: input.imageUrl,
    p_stock_quantity: 0,
    p_is_active: true,
  });

  if (result.success) {
    revalidatePath("/admin/products");
  }

  return result;
}

export async function adminUpdateProductAction(input: {
  productId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_update_product", {
    p_product_id: input.productId,
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_category_id: input.categoryId,
    p_set_category: true,
    p_image_url: input.imageUrl,
    p_set_image: true,
  });

  if (result.success) {
    revalidatePath("/admin/products");
  }

  return result;
}

export async function adminDeactivateProductAction(input: {
  productId: string;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_deactivate_product", {
    p_product_id: input.productId,
  });

  if (result.success) {
    revalidatePath("/admin/products");
  }

  return result;
}
