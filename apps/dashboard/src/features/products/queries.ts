import { createElement } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { Badge } from "../../components/ui/badge";
import type { ProductCategoryOption, ProductRow, TableModel } from "../../types/dashboard";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { formatCurrency } from "../../lib/utils/format-currency";

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

export async function listProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((product) => mapProductRow(product as Record<string, unknown>));
}

export async function listVendorProducts(): Promise<ProductRow[]> {
  const supabase = await getSupabaseServerClient();

  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) throw vendorError;

  if (!vendorId) {
    return [];
  }

  const { data, error } = await supabase
    .from("products")
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((product) => mapProductRow(product as Record<string, unknown>));
}

export function getAdminOverviewProductsTableModel(products: ProductRow[]): TableModel {
  return {
    title: "Product Snapshot",
    headers: ["Product", "Category", "Price", "Stock"],
    rows: products.map((product) => [
      product.name,
      product.category_id ?? "-",
      formatCurrency(product.price),
      `${product.stock_quantity}`,
    ]),
  };
}

export function getAdminProductsTableModel(products: ProductRow[]): TableModel {
  return {
    title: "Products",
    headers: ["Name", "Vendor", "Price", "Stock"],
    rows: products.map((product) => [
      product.name,
      product.vendor_id,
      formatCurrency(product.price),
      `${product.stock_quantity}`,
    ]),
  };
}

export function getVendorOverviewProductsTableModel(products: ProductRow[]): TableModel {
  return {
    title: "Catalog",
    headers: ["Product", "Price", "Stock", "Image"],
    rows: products.map((product) => [
      product.name,
      formatCurrency(product.price),
      `${product.stock_quantity}`,
      product.image_url ? "Supabase Storage" : "No image",
    ]),
  };
}

export function getVendorProductsTableModel(products: ProductRow[]): TableModel {
  return {
    title: "Products",
    headers: ["Name", "Price", "Stock", "Status"],
    rows: products.map((product) => [
      product.name,
      formatCurrency(product.price),
      `${product.stock_quantity}`,
      createElement(Badge, {
        key: `${product.id}-product-status`,
        children: product.is_active ? "active" : "inactive",
      }),
    ]),
  };
}

export function getInventoryTableModel(products: ProductRow[]): TableModel {
  return {
    title: "Inventory",
    headers: ["Product", "Stock", "Barcode", "Needs Restock"],
    rows: products.map((product) => [
      product.name,
      `${product.stock_quantity}`,
      product.barcode ?? "-",
      product.stock_quantity < 25 ? "Yes" : "No",
    ]),
  };
}

export async function listProductCategories(): Promise<ProductCategoryOption[]> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((category) => ({
    id: String(category.id),
    name: String(category.name),
    name_ar: category.name_ar ? String(category.name_ar) : null,
    slug: category.slug ? String(category.slug) : null,
    icon: category.icon ? String(category.icon) : null,
    image_url: category.image_url ? String(category.image_url) : null,
    sort_order: Number(category.sort_order ?? 0),
    is_active: Boolean(category.is_active),
    parent_id: category.parent_id ? String(category.parent_id) : null,
    display_name: formatCategoryLabel({
      name: String(category.name),
      name_ar: category.name_ar ? String(category.name_ar) : null,
    }),
  }));
}

export async function getProductById(productId: string): Promise<ProductRow | null> {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("products")
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .eq("id", productId)
    .maybeSingle();

  if (error) throw error;

  return data ? mapProductRow(data as Record<string, unknown>) : null;
}
