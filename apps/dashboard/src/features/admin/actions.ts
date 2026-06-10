"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfileServer, getCurrentSessionUserServer } from "../auth/guards";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import type { ProductImportValidationError, ProductImportParsedRow, VendorBulkCreateProductsResult } from "../vendor-products/import/types";
import { validateProductImportRows } from "../vendor-products/import/validate-product-import";

type AdminActionResult = {
  success: boolean;
  error: string | null;
  message?: string | null;
};

type AdminAccessResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };

async function ensureAdminActionAccess(): Promise<AdminAccessResult> {
  const user = await getCurrentSessionUserServer();

  if (!user) {
    return {
      success: false,
      error: "يجب تسجيل الدخول بحساب مدير لتنفيذ هذا الإجراء.",
    };
  }

  const profile = await getCurrentProfileServer(user.id);

  if (profile?.role !== "admin") {
    return {
      success: false,
      error: "هذا الإجراء متاح للإدارة فقط، ولا يمكن للمتاجر استخدامه.",
    };
  }

  return {
    success: true,
  };
}

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
      message: null,
    };
  }

  return {
    success: true,
    error: null,
    message: null,
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
  barcode: string | null;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string;
}): Promise<AdminActionResult> {
  const result = await callAdminRpc("admin_create_product", {
    p_vendor_id: input.vendorId,
    p_name: input.name,
    p_barcode: input.barcode,
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
  barcode: string | null;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
}): Promise<AdminActionResult> {
  const updateCategoryResult = await callAdminRpc(
    "admin_update_global_product_category",
    {
      p_product_id: input.productId,
      p_category_id: input.categoryId,
    }
  );

  if (!updateCategoryResult.success) {
    return updateCategoryResult;
  }

  const result = await callAdminRpc("admin_update_product", {
    p_product_id: input.productId,
    p_name: input.name,
    p_barcode: input.barcode,
    p_set_barcode: true,
    p_description: input.description,
    p_price: input.price,
    p_category_id: null,
    p_set_category: false,
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

export async function adminSaveProductImageToGlobalCatalogueAction(input: {
  productId: string;
}): Promise<AdminActionResult> {
  if (!input.productId.trim()) {
    return {
      success: false,
      error: "تعذر تحديد المنتج المطلوب لحفظ الصورة العامة.",
      message: null,
    };
  }

  const adminAccess = await ensureAdminActionAccess();

  if (!adminAccess.success) {
    return {
      success: false,
      error: adminAccess.error,
      message: null,
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, category_id, barcode, name, image_url")
    .eq("id", input.productId)
    .maybeSingle();

  if (productError || !product) {
    return {
      success: false,
      error: "تعذر العثور على المنتج المطلوب.",
      message: null,
    };
  }

  const barcode = String(product.barcode ?? "").trim();
  const imageUrl = String(product.image_url ?? "").trim();

  if (!barcode) {
    return {
      success: false,
      error: "لا يمكن حفظ صورة عامة لهذا المنتج لأن الباركود غير متوفر.",
      message: null,
    };
  }

  if (!imageUrl) {
    return {
      success: false,
      error: "لا يمكن حفظ صورة عامة لهذا المنتج لأن الصورة غير متوفرة.",
      message: null,
    };
  }

  let categorySlug: string | null = null;

  if (product.category_id) {
    const { data: category, error: categoryError } = await supabase
      .from("categories")
      .select("slug")
      .eq("id", String(product.category_id))
      .maybeSingle();

    if (categoryError) {
      return {
        success: false,
        error: "تعذر تحديد فئة المنتج قبل حفظ الصورة العامة.",
        message: null,
      };
    }

    categorySlug = category?.slug ? String(category.slug) : null;
  }

  const { error: upsertError } = await supabase.from("global_products").upsert(
    {
      barcode,
      name: String(product.name ?? "").trim(),
      name_ar: null,
      brand: null,
      category_slug: categorySlug,
      image_url: imageUrl,
    },
    {
      onConflict: "barcode",
    }
  );

  if (upsertError) {
    return {
      success: false,
      error: upsertError.message,
      message: null,
    };
  }

  revalidatePath("/admin/products");
  revalidatePath("/admin");

  return {
    success: true,
    error: null,
    message: "تم حفظ الصورة في الكتالوج العام بنجاح.",
  };
}

export async function adminSeedProductsToVendorAction(input: {
  vendorId: string;
  rows: ProductImportParsedRow[];
}): Promise<VendorBulkCreateProductsResult> {
  const adminAccess = await ensureAdminActionAccess();

  if (!adminAccess.success) {
    return {
      success: false,
      error: adminAccess.error,
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const vendorId = input.vendorId.trim();
  const rows = input.rows ?? [];

  if (!vendorId) {
    return {
      success: false,
      error: "يرجى اختيار الصيدلية المستهدفة قبل رفع المنتجات.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  if (rows.length === 0) {
    return {
      success: false,
      error: "لا توجد صفوف صالحة لإرسالها إلى الخادم.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const supabase = await getSupabaseServerClient();
  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, approval_status, is_active")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      success: false,
      error: "تعذر العثور على الصيدلية المحددة.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  if (String(vendor.approval_status ?? "") !== "approved" || !vendor.is_active) {
    return {
      success: false,
      error: "يمكن إضافة المنتجات فقط إلى صيدلية نشطة ومعتمدة.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const requestedCategorySlugs = Array.from(
    new Set(
      rows
        .map((row) => String(row.values.category_slug ?? "").trim().toLowerCase())
        .filter((slug) => slug.length > 0)
    )
  );
  const requestedBarcodes = Array.from(
    new Set(
      rows
        .map((row) => String(row.values.barcode ?? "").trim())
        .filter((barcode) => barcode.length > 0)
    )
  );

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("is_active", true)
    .in("slug", requestedCategorySlugs.length > 0 ? requestedCategorySlugs : ["__no_match__"]);

  if (categoriesError) {
    return {
      success: false,
      error: "تعذر تحميل الفئات النشطة المطلوبة للتحقق من الملف.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const categoryIdBySlug = new Map<string, string>(
    (categoriesData ?? [])
      .filter((category) => category.slug)
      .map((category) => [String(category.slug).trim().toLowerCase(), String(category.id)] as const)
  );

  const { data: existingProducts, error: existingProductsError } = await supabase
    .from("products")
    .select("id, barcode")
    .eq("vendor_id", vendorId)
    .in("barcode", requestedBarcodes.length > 0 ? requestedBarcodes : ["__no_match__"]);

  if (existingProductsError) {
    return {
      success: false,
      error: "تعذر التحقق من الباركودات الحالية داخل كتالوج الصيدلية.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const existingProductIdByBarcode = new Map<string, string>(
    (existingProducts ?? [])
      .filter((product) => product.id && product.barcode)
      .map((product) => [String(product.barcode).trim(), String(product.id)] as const)
  );

  const validation = validateProductImportRows(rows, {
    categoryIdBySlug,
  });

  if (validation.totalRows === 0) {
    return {
      success: false,
      error: "الملف لا يحتوي على صفوف بيانات قابلة للاستيراد.",
      totalRows: 0,
      insertedCount: 0,
      updatedCount: 0,
      failedCount: 0,
      errors: [],
    };
  }

  const insertionErrors: ProductImportValidationError[] = [];
  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of validation.validRows) {
    const payload = {
      vendor_id: vendorId,
      category_id: row.categoryId,
      name: row.name,
      description: row.description,
      price: row.price,
      stock_quantity: row.stockQuantity,
      barcode: row.barcode,
      image_url: row.imageUrl,
      is_active: true,
    };

    if (row.barcode) {
      const existingProductId = existingProductIdByBarcode.get(row.barcode) ?? null;

      if (existingProductId) {
        const { error } = await supabase
          .from("products")
          .update({
            category_id: payload.category_id,
            name: payload.name,
            description: payload.description,
            price: payload.price,
            stock_quantity: payload.stock_quantity,
            image_url: payload.image_url,
            is_active: true,
          })
          .eq("id", existingProductId)
          .eq("vendor_id", vendorId);

        if (error) {
          insertionErrors.push({
            rowNumber: row.rowNumber,
            field: "row",
            message: error.message ?? "تعذر تحديث هذا المنتج.",
          });
          continue;
        }

        updatedCount += 1;
        continue;
      }
    }

    const { error } = await supabase.from("products").insert(payload);

    if (error) {
      insertionErrors.push({
        rowNumber: row.rowNumber,
        field: "row",
        message: error.message ?? "تعذر إدراج هذا الصف.",
      });
      continue;
    }

    insertedCount += 1;
  }

  const allErrors = [...validation.errors, ...insertionErrors];
  const failedCount = validation.totalRows - insertedCount - updatedCount;

  if (insertedCount > 0 || updatedCount > 0) {
    revalidatePath("/admin/products");
    revalidatePath("/admin/vendors");
    revalidatePath("/vendor/products");
    revalidatePath("/vendor/inventory");
  }

  return {
    success: true,
    error:
      insertedCount > 0 || updatedCount > 0
        ? null
        : "اكتمل فحص الملف لكن لم يتم إنشاء أو تحديث أي منتج.",
    totalRows: validation.totalRows,
    insertedCount,
    updatedCount,
    failedCount,
    errors: allErrors,
  };
}
