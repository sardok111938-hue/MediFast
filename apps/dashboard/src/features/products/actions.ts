"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";

type ProductActionResult = {
  success: boolean;
  error: string | null;
};

async function callProductRpc<TParams extends Record<string, unknown>>(
  fn: string,
  params: TParams
): Promise<ProductActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc(fn, params);

  if (error) {
  console.error("RPC ERROR:", error);

  return {
    success: false,
    error: error.message ?? "RPC failed",
  };
}

  return {
    success: true,
    error: null,
  };
}

export async function vendorCreateProductAction(input: {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
  stockQuantity: number;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_create_product", {
  p_category_id: input.categoryId,
  p_description: input.description,
  p_image_url: input.imageUrl,
  p_name: input.name,
  p_price: input.price,
  p_stock_quantity: input.stockQuantity,
});

  if (result.success) {
    revalidatePath("/vendor/products");
  }

  return result;
}

export async function vendorUpdateProductAction(input: {
  productId: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
  stockQuantity: number;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_update_product", {
    p_product_id: input.productId,
    p_name: input.name,
    p_description: input.description,
    p_price: input.price,
    p_category_id: input.categoryId,
    p_set_category: true,
    p_image_url: input.imageUrl,
    p_set_image: true,
    p_stock_quantity: input.stockQuantity,
  });

  if (result.success) {
    revalidatePath("/vendor/products");
  }

  return result;
}

export async function vendorUpdateProductStockAction(input: {
  productId: string;
  stockQuantity: number;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_update_product", {
    p_product_id: input.productId,
    p_stock_quantity: input.stockQuantity,
  });

  if (result.success) {
    revalidatePath("/vendor/products");
    revalidatePath("/vendor/inventory");
  }

  return result;
}

export async function vendorDeactivateProductAction(input: {
  productId: string;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_deactivate_product", {
    p_product_id: input.productId,
  });

  if (result.success) {
    revalidatePath("/vendor/products");
  }

  return result;
}

export async function vendorActivateProductAction(input: {
  productId: string;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_activate_product", {
    p_product_id: input.productId,
  });

  if (result.success) {
    revalidatePath("/vendor/products");
    revalidatePath("/vendor/inventory");
  }

  return result;
}
