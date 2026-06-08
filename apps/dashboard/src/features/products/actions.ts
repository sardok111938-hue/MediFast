"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import type {
  ProductImportParsedRow,
  ProductImportValidationError,
  VendorBulkCreateProductsInput,
  VendorBulkCreateProductsResult,
} from "../vendor-products/import/types";
import { validateProductImportRows } from "../vendor-products/import/validate-product-import";

type ProductActionResult = {
  success: boolean;
  error: string | null;
};

type VendorImportAccessResult =
  | {
      success: true;
      vendorId: string;
    }
  | {
      success: false;
      error: string;
    };

function createBulkImportFailure(
  error: string,
): VendorBulkCreateProductsResult {
  return {
    success: false,
    error,
    totalRows: 0,
    insertedCount: 0,
    updatedCount: 0,
    failedCount: 0,
    errors: [],
  };
}

async function callProductRpc<TParams extends Record<string, unknown>>(
  fn: string,
  params: TParams,
): Promise<ProductActionResult> {
  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.rpc(fn, params);

  if (error) {
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

async function getApprovedActiveVendorId(): Promise<VendorImportAccessResult> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: "يجب تسجيل الدخول بحساب متجر صالح لتنفيذ الاستيراد.",
    };
  }

  const { data: vendorId, error: vendorIdError } =
    await supabase.rpc("get_vendor_id");

  if (vendorIdError || !vendorId) {
    return {
      success: false,
      error: "تعذر تحديد حساب الصيدلية المرتبط بهذا المستخدم.",
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return {
      success: false,
      error: "تعذر العثور على ملف المستخدم المرتبط بالحساب الحالي.",
    };
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, user_id, approval_status, is_active")
    .eq("id", String(vendorId))
    .eq("user_id", profile.id)
    .maybeSingle();

  if (vendorError || !vendor) {
    return {
      success: false,
      error: "لا يمكنك الاستيراد إلا داخل الصيدلية المرتبطة بحسابك الحالي.",
    };
  }

  if (
    String(vendor.approval_status ?? "") !== "approved" ||
    !vendor.is_active
  ) {
    return {
      success: false,
      error: "الاستيراد متاح فقط للمتاجر النشطة والموافق عليها.",
    };
  }

  return {
    success: true,
    vendorId: String(vendor.id),
  };
}

async function bulkImportProductsForVendor(input: {
  vendorId: string;
  rows: ProductImportParsedRow[];
  revalidatePaths: string[];
}): Promise<VendorBulkCreateProductsResult> {
  const supabase = await getSupabaseServerClient();
  const rows = input.rows ?? [];

  if (rows.length === 0) {
    return createBulkImportFailure("لا توجد صفوف صالحة لإرسالها إلى الخادم.");
  }

  const requestedCategorySlugs = Array.from(
    new Set(
      rows
        .map((row) =>
          String(row.values.category_slug ?? "")
            .trim()
            .toLowerCase(),
        )
        .filter((slug) => slug.length > 0),
    ),
  );

  const requestedBarcodes = Array.from(
    new Set(
      rows
        .map((row) => String(row.values.barcode ?? "").trim())
        .filter((barcode) => barcode.length > 0),
    ),
  );

  const { data: categoriesData, error: categoriesError } = await supabase
    .from("categories")
    .select("id, slug")
    .eq("is_active", true)
    .in(
      "slug",
      requestedCategorySlugs.length > 0
        ? requestedCategorySlugs
        : ["__no_match__"],
    );

  if (categoriesError) {
    return createBulkImportFailure(
      "تعذر تحميل الفئات النشطة المطلوبة للتحقق من الملف.",
    );
  }

  const categoryIdBySlug = new Map<string, string>(
    (categoriesData ?? [])
      .filter((category) => category.slug)
      .map(
        (category) =>
          [
            String(category.slug).trim().toLowerCase(),
            String(category.id),
          ] as const,
      ),
  );

  const { data: existingProducts, error: existingProductsError } =
    await supabase
      .from("products")
      .select("barcode")
      .eq("vendor_id", input.vendorId)
      .in(
        "barcode",
        requestedBarcodes.length > 0 ? requestedBarcodes : ["__no_match__"],
      );

  if (existingProductsError) {
    return createBulkImportFailure(
      "تعذر التحقق من الباركودات الحالية داخل كتالوج الصيدلية.",
    );
  }

  const existingBarcodes = new Set<string>(
    (existingProducts ?? [])
      .map((product) => (product.barcode ? String(product.barcode).trim() : ""))
      .filter((barcode) => barcode.length > 0),
  );

  const validation = validateProductImportRows(rows, {
    categoryIdBySlug,
  });

  if (validation.totalRows === 0) {
    return createBulkImportFailure(
      "الملف لا يحتوي على صفوف بيانات قابلة للاستيراد.",
    );
  }

  const insertionErrors: ProductImportValidationError[] = [];

  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of validation.validRows) {
    const payload = {
      vendor_id: input.vendorId,
      category_id: row.categoryId,
      name: row.name,
      description: row.description,
      price: row.price,
      stock_quantity: row.stockQuantity,
      barcode: row.barcode,
      image_url: row.imageUrl,
      is_active: true,
    };

    if (row.barcode && existingBarcodes.has(row.barcode)) {
      const { error } = await supabase
        .from("products")
        .update({
          price: payload.price,
          stock_quantity: payload.stock_quantity,
          is_active: true,
        })
        .eq("vendor_id", input.vendorId)
        .eq("barcode", row.barcode);

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
    for (const path of input.revalidatePaths) {
      revalidatePath(path);
    }
  }

  return {
    success: true,
    error: null,
    totalRows: validation.totalRows,
    insertedCount,
    updatedCount,
    failedCount,
    errors: allErrors,
  };
}

export async function vendorCreateProductAction(input: {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  imageUrl: string | null;
  stockQuantity: number;
  lowStockThreshold: number;
  barcode: string | null;
}): Promise<ProductActionResult> {
  const result = await callProductRpc("vendor_create_product", {
    p_category_id: input.categoryId,
    p_description: input.description,
    p_image_url: input.imageUrl,
    p_name: input.name,
    p_price: input.price,
    p_stock_quantity: input.stockQuantity,
    p_low_stock_threshold: input.lowStockThreshold,
    p_barcode: input.barcode,
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
  lowStockThreshold: number;
  barcode: string | null;
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
    p_low_stock_threshold: input.lowStockThreshold,
    p_barcode: input.barcode,
    p_set_barcode: true,
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

export async function vendorBulkCreateProductsAction(
  input: VendorBulkCreateProductsInput,
): Promise<VendorBulkCreateProductsResult> {
  const vendorAccess = await getApprovedActiveVendorId();

  if (!vendorAccess.success) {
    return createBulkImportFailure(vendorAccess.error);
  }

  return bulkImportProductsForVendor({
    vendorId: vendorAccess.vendorId,
    rows: input.rows,
    revalidatePaths: ["/vendor/products", "/vendor/inventory"],
  });
}

export async function adminBulkImportProductsForVendorAction(input: {
  vendorId: string;
  rows: ProductImportParsedRow[];
}): Promise<VendorBulkCreateProductsResult> {
  const supabase = await getSupabaseServerClient();
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    return createBulkImportFailure(
      "هذا الإجراء متاح للإدارة فقط، ولا يمكن للمتاجر استخدامه.",
    );
  }

  const vendorId = String(input.vendorId ?? "").trim();

  if (!vendorId) {
    return createBulkImportFailure(
      "يرجى اختيار الصيدلية المستهدفة قبل رفع المنتجات.",
    );
  }

  const { data: vendor, error: vendorError } = await supabase
    .from("vendors")
    .select("id, approval_status, is_active")
    .eq("id", vendorId)
    .maybeSingle();

  if (vendorError || !vendor) {
    return createBulkImportFailure("تعذر العثور على الصيدلية المحددة.");
  }

  if (
    String(vendor.approval_status ?? "") !== "approved" ||
    !vendor.is_active
  ) {
    return createBulkImportFailure(
      "يمكن إضافة المنتجات فقط إلى صيدلية نشطة ومعتمدة.",
    );
  }

  return bulkImportProductsForVendor({
    vendorId,
    rows: input.rows,
    revalidatePaths: [
      "/admin/vendors",
      "/admin/products",
      "/vendor/products",
      "/vendor/inventory",
    ],
  });
}
