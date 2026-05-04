import type { ProductRow } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";

export async function createProduct(input: {
  vendor_id: string;
  category_id?: string | null;
  name: string;
  description?: string | null;
  price: number;
  image_url?: string | null;
  barcode?: string | null;
  stock_quantity: number;
  is_active?: boolean;
}) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      ...input,
      is_active: input.is_active ?? true,
    })
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .maybeSingle();

  return {
    data: data ? mapProductRow(data as Record<string, unknown>) : null,
    error,
  };
}

export async function updateProduct(
  productId: string,
  input: Partial<{
    category_id: string | null;
    name: string;
    description: string | null;
    price: number;
    image_url: string | null;
    barcode: string | null;
    stock_quantity: number;
    is_active: boolean;
  }>
) {
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("products")
    .update(input)
    .eq("id", productId)
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .maybeSingle();

  return {
    data: data ? mapProductRow(data as Record<string, unknown>) : null,
    error,
  };
}

export async function deleteProduct(productId: string) {
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.from("products").delete().eq("id", productId);

  return {
    data: { id: productId },
    error,
  };
}

function mapProductRow(product: Record<string, unknown>): ProductRow {
  return {
    id: String(product.id),
    vendor_id: String(product.vendor_id),
    category_id: product.category_id ? String(product.category_id) : null,
    name: String(product.name),
    description: product.description ? String(product.description) : null,
    price: Number(product.price ?? 0),
    stock_quantity: Number(product.stock_quantity ?? 0),
    barcode: product.barcode ? String(product.barcode) : null,
    is_active: Boolean(product.is_active),
    image_url: product.image_url ? String(product.image_url) : null,
  };
}
