"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Input } from "../../../components/ui/input";
import { LoadingState } from "../../../components/ui/loading-state";
import { Table } from "../../../components/ui/table";
import { useLocale } from "../../../lib/i18n/locale-context";
import { buildPaginatedResult, getPaginationRange, type PaginatedResult } from "../../../lib/pagination";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { formatCurrency } from "../../../lib/utils/format-currency";
import type { ProductCategoryOption, ProductRow } from "../../../types/dashboard";
import { BulkProductImportCard } from "../../vendor-products/import/bulk-product-import-card";
import {
  getCategoryOptionLabel,
  getCategoryPathDisplayName,
  getChildCategoryOptions,
  getProductCategorySelection,
  getSubmittedProductCategoryId,
  getTopLevelCategoryOptions,
} from "../category-options";
import {
  vendorCreateProductAction,
  vendorActivateProductAction,
  vendorDeactivateProductAction,
  vendorUpdateProductAction,
} from "../actions";

type VendorProductsData = {
  vendorId: string;
  products: PaginatedResult<ProductRow>;
  counts: {
    all: number;
    active: number;
    inactive: number;
    lowStock: number;
    outOfStock: number;
  };
};

type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  parent_category_id: string;
  child_category_id: string;
  stock_quantity: string;
  low_stock_threshold: string;
  barcode: string;
};

const PAGE_SIZE = 20;
const DEFAULT_LOW_STOCK_THRESHOLD = 5;
const emptyFormValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  parent_category_id: "",
  child_category_id: "",
  stock_quantity: "",
  low_stock_threshold: String(DEFAULT_LOW_STOCK_THRESHOLD),
  barcode: "",
};

function mapProductRow(product: Record<string, unknown>): ProductRow {
  return {
    id: String(product.id),
    vendor_id: String(product.vendor_id),
    category_id: product.category_id ? String(product.category_id) : null,
    name: String(product.name),
    description: product.description ? String(product.description) : null,
    price: Number(product.price ?? 0),
    low_stock_threshold: Number(
  product.low_stock_threshold ??
    DEFAULT_LOW_STOCK_THRESHOLD,
),
    stock_quantity: Number(product.stock_quantity ?? 0),
    barcode: product.barcode ? String(product.barcode) : null,
    is_active: Boolean(product.is_active),
    image_url: product.display_image_url
    ? String(product.display_image_url)
    : product.image_url
    ? String(product.image_url)
    : null,
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر إكمال طلب المنتج الآن.";
}

function buildFormValues(product: ProductRow | null | undefined, categories: ProductCategoryOption[]): ProductFormValues {
  const selection = getProductCategorySelection(categories, product?.category_id);

  if (!product) {
    return {
      ...emptyFormValues,
      parent_category_id: selection.parentCategoryId,
      child_category_id: selection.childCategoryId,
    };
  }

  return {
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    parent_category_id: selection.parentCategoryId,
    child_category_id: selection.childCategoryId,
    stock_quantity: String(product.stock_quantity),
    barcode: product.barcode ?? "",
    low_stock_threshold: String(
    product.low_stock_threshold ??
    DEFAULT_LOW_STOCK_THRESHOLD,
  ),
  };
}

function validateProductForm(values: ProductFormValues, categories: ProductCategoryOption[]) {
  const name = values.name.trim();
  const description = values.description.trim();
  const barcode = values.barcode.trim();
  const price = Number(values.price);
  const stockQuantity = values.stock_quantity.trim() ? Number(values.stock_quantity) : 0;
  const lowStockThreshold = Number(values.low_stock_threshold);
  const categoryId = getSubmittedProductCategoryId(values, categories);

  if (!name || !description || !values.price || !categoryId) {
    return { error: "يرجى إكمال جميع الحقول المطلوبة." };
  }

  if (Number.isNaN(price) || price <= 0) {
    return { error: "يجب أن يكون السعر أكبر من 0." };
  }

  if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
    return { error: "يجب أن تكون الكمية 0 أو أكثر." };
  }
if (
  Number.isNaN(lowStockThreshold) ||
  lowStockThreshold < 0
) {
  return {
    error: "حد التنبيه يجب أن يكون 0 أو أكثر.",
  };
}
return {
  error: null,
  payload: {
    name,
    description,
    barcode,
    price,
    category_id: categoryId,
    stock_quantity: stockQuantity,
    low_stock_threshold: lowStockThreshold,
  },
};
}

async function resizeProductImage(file: File): Promise<Blob> {
  const image = document.createElement("img");
  const objectUrl = URL.createObjectURL(file);

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("تعذر قراءة صورة المنتج."));
    image.src = objectUrl;
  });

  const size = 1000;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    URL.revokeObjectURL(objectUrl);
    throw new Error("تعذر تجهيز صورة المنتج.");
  }

  ctx.fillStyle = "#F7FAF8";
  ctx.fillRect(0, 0, size, size);

  const scale = Math.min(size / image.width, size / image.height);

  const width = image.width * scale;
  const height = image.height * scale;

  const x = (size - width) / 2;
  const y = (size - height) / 2;

  ctx.drawImage(image, x, y, width, height);

  URL.revokeObjectURL(objectUrl);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("تعذر ضغط صورة المنتج."));
        }
      },
      "image/jpeg",
      0.84,
    );
  });
}

async function uploadProductImage(file: File) {
  const supabase = getSupabaseBrowserClient();

  const optimizedImage = await resizeProductImage(file);

  const path = `products/${Date.now()}-${crypto.randomUUID()}.jpg`;

  const { error } = await supabase.storage.from("product-images").upload(path, optimizedImage, {
    upsert: true,
    contentType: "image/jpeg",
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);

  return data.publicUrl;
}

async function loadVendorCategories(): Promise<ProductCategoryOption[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id, created_at")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

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

type VendorProductStatusFilter = "all" | "active" | "inactive" | "low_stock" | "out_of_stock";

async function loadVendorProductsData(page: number, statusFilter: VendorProductStatusFilter): Promise<VendorProductsData> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    throw new Error("حساب المتجر غير مرتبط بشكل صحيح.");
  }

  const { from, to } = getPaginationRange(page, PAGE_SIZE);
let productsQuery = supabase
  .from("products_with_global_images")
.select(`
  id,
  vendor_id,
  category_id,
  name,
  description,
  price,
  stock_quantity,
  low_stock_threshold,
  barcode,
  is_active,
  image_url,
  display_image_url,
  global_image_url
`, { count: "exact" })
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, to);

  if (statusFilter === "active") {
    productsQuery = productsQuery.eq("is_active", true);
  } else if (statusFilter === "inactive") {
    productsQuery = productsQuery.eq("is_active", false);
  } else if (statusFilter === "low_stock") {
    productsQuery = productsQuery.eq("is_active", true).gt("stock_quantity", 0).lte("stock_quantity", DEFAULT_LOW_STOCK_THRESHOLD);
  } else if (statusFilter === "out_of_stock") {
    productsQuery = productsQuery.eq("is_active", true).lte("stock_quantity", 0);
  }

  const [
    productsResult,
    allCountResult,
    activeCountResult,
    inactiveCountResult,
    lowStockCountResult,
    outOfStockCountResult,
  ] = await Promise.all([
    productsQuery,
    supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("is_active", true),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("is_active", false),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("is_active", true).gt("stock_quantity", 0).lte("stock_quantity", DEFAULT_LOW_STOCK_THRESHOLD),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("vendor_id", vendorId).eq("is_active", true).lte("stock_quantity", 0),
  ]);

  const { data: productsData, error: productsError, count } = productsResult;

  if (productsError) {
    throw productsError;
  }

  return {
    vendorId: String(vendorId),
    products: buildPaginatedResult(
      (productsData ?? []).map((product) => mapProductRow(product as Record<string, unknown>)),
      count,
      { page, pageSize: PAGE_SIZE },
    ),
    counts: {
      all: allCountResult.count ?? 0,
      active: activeCountResult.count ?? 0,
      inactive: inactiveCountResult.count ?? 0,
      lowStock: lowStockCountResult.count ?? 0,
      outOfStock: outOfStockCountResult.count ?? 0,
    },
  };
}

function VendorProductForm({
  mode,
  categories,
  product,
  loading,
  onSubmit,
  onCancel,
}: {
  mode: "create" | "edit";
  categories: ProductCategoryOption[];
  product?: ProductRow | null;
  loading: boolean;
  onSubmit: (formData: FormData, imageFile: File | null) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const [values, setValues] = useState<ProductFormValues>(buildFormValues(product, categories));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(product?.image_url ?? null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setValues(buildFormValues(product, categories));
    setImageFile(null);
    setPreviewUrl(product?.image_url ?? null);
    setMessage(null);
    setMessageType(null);
  }, [categories, product, mode]);

  useEffect(() => {
  return () => {
    if (previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }
  };
}, [previewUrl]);

  const topLevelCategories = useMemo(() => getTopLevelCategoryOptions(categories), [categories]);
  const childCategories = useMemo(() => getChildCategoryOptions(categories, values.parent_category_id), [categories, values.parent_category_id]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextValues = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: String(formData.get("price") ?? ""),
      parent_category_id: String(formData.get("parent_category_id") ?? ""),
      child_category_id: String(formData.get("child_category_id") ?? ""),
      stock_quantity: String(formData.get("stock_quantity") ?? "0"),
      barcode: String(formData.get("barcode") ?? ""),
      low_stock_threshold: String(
        formData.get("low_stock_threshold") ??
        DEFAULT_LOW_STOCK_THRESHOLD,
),
    };

    setValues(nextValues);

    const validation = validateProductForm(nextValues, categories);
    if (validation.error) {
      setMessage(validation.error);
      setMessageType("error");
      return;
    }

    try {
      await onSubmit(formData, imageFile);
      setMessage(mode === "create" ? "تم إنشاء المنتج بنجاح." : "تم تحديث المنتج بنجاح.");
      setMessageType("success");

      if (mode === "create") {
        setValues(emptyFormValues);
        setImageFile(null);
        setPreviewUrl(null);
        event.currentTarget.reset();
      }
    } catch (error) {
      setMessage(normalizeError(error));
      setMessageType("error");
    }
  }

return (
  <form className="form-grid" onSubmit={handleSubmit}>
    {product ? <input type="hidden" name="product_id" value={product.id} /> : null}

    <div className="field">
      <Input
        id={`${mode}-name`}
        name="name"
        value={values.name}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            name: event.target.value,
          }))
        }
        placeholder="اسم المنتج"
        required
      />
    </div>

    <div className="field">
      <textarea
        id={`${mode}-description`}
        name="description"
        className="textarea"
        rows={2}
        value={values.description}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        placeholder="وصف المنتج"
        required
      />
    </div>

    <div className="field">
      <Input
        id={`${mode}-price`}
        name="price"
        type="number"
        min="0.01"
        step="0.01"
        value={values.price}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            price: event.target.value,
          }))
        }
        placeholder="السعر"
        required
      />
    </div>

    <div className="field">
      <select
        id={`${mode}-category`}
        name="parent_category_id"
        className="input"
        value={values.parent_category_id}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            parent_category_id: event.target.value,
            child_category_id: "",
          }))
        }
        required
      >
        <option value="">الفئة</option>
        {topLevelCategories.map((category) => (
          <option key={category.id} value={category.id}>
            {getCategoryOptionLabel(category)}
          </option>
        ))}
      </select>
      {categories.length === 0 ? <p className="danger">{t("No categories are currently available yet.")}</p> : null}
    </div>

    {childCategories.length > 0 ? (
      <div className="field">
        <select
          id={`${mode}-subcategory`}
          name="child_category_id"
          className="input"
          value={values.child_category_id}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              child_category_id: event.target.value,
            }))
          }
          required
        >
          <option value="">الفئة الفرعية</option>
          {childCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {getCategoryPathDisplayName(categories, category.id)}
            </option>
          ))}
        </select>
      </div>
    ) : null}

    <div className="field">
  <Input
    id={`${mode}-barcode`}
    name="barcode"
    value={values.barcode}
    onChange={(event) =>
      setValues((current) => ({
        ...current,
        barcode: event.target.value,
      }))
    }
    placeholder="الباركود"
  />
</div>

    <div className="field">
      <Input
        id={`${mode}-stock`}
        name="stock_quantity"
        type="number"
        min="0"
        step="1"
        value={values.stock_quantity}
        onChange={(event) =>
          setValues((current) => ({
            ...current,
            stock_quantity: event.target.value,
          }))
        }
        placeholder="الكمية المتوفرة"
      />
    </div>

<div className="field">
  <Input
    id={`${mode}-low-stock-threshold`}
    name="low_stock_threshold"
    type="number"
    min="0"
    step="1"
    value={values.low_stock_threshold}
    onChange={(event) =>
      setValues((current) => ({
        ...current,
        low_stock_threshold: event.target.value,
      }))
    }
  />

  <p className="muted">
    حد المخزون المنخفض · موصى به: 5–10
  </p>
</div>

    <div className="field">
      <label htmlFor={`${mode}-image`}>رفع صورة المنتج</label>
      <input
        id={`${mode}-image`}
        type="file"
        accept="image/*"
        className="input"
        onChange={(event) => {
          const file = event.target.files?.[0] ?? null;

          setImageFile(file);

          if (file) {
            setPreviewUrl(URL.createObjectURL(file));
          } else {
            setPreviewUrl(product?.image_url ?? null);
          }
        }}
      />

      {previewUrl ? (
        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-start" }}>
          <img
            src={previewUrl}
            alt="معاينة المنتج"
            style={{
              width: 88,
              height: 88,
              objectFit: "cover",
              borderRadius: 14,
              border: "1px solid #DCEBDF",
              backgroundColor: "#F8FCF8",
            }}
          />
        </div>
      ) : null}
    </div>

    {message ? <p className={messageType === "error" ? "danger" : "success"}>{message}</p> : null}

    <div className="actions">
      <Button type="submit" disabled={loading}>
        {loading ? "جارٍ الحفظ..." : mode === "create" ? "إضافة منتج" : "حفظ التعديلات"}
      </Button>

      {onCancel ? (
        <Button type="button" className="secondary-button" onClick={onCancel} disabled={loading}>
          إلغاء
        </Button>
      ) : null}
    </div>
  </form>
);
}

export function VendorProductsClient({ initialEditingProductId }: { initialEditingProductId?: string }) {
  const [data, setData] = useState<VendorProductsData | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<VendorProductStatusFilter>("all");
  const [page, setPage] = useState(1);
  const editFormRef = useRef<HTMLDivElement | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    setCategoriesError(null);

    try {
      const nextData = await loadVendorProductsData(page, statusFilter);
      setData(nextData);
    } catch (nextError) {
      setError(normalizeError(nextError));
      setData(null);
    } finally {
      setLoading(false);
    }

    try {
      const nextCategories = await loadVendorCategories();
      setCategories(nextCategories);
    } catch (nextError) {
      setCategories([]);
      setCategoriesError(normalizeError(nextError));
    }
  }

  async function loadCategoriesOnly() {
    setCategoriesError(null);

    try {
      const nextCategories = await loadVendorCategories();
      setCategories(nextCategories);
    } catch (nextError) {
      setCategories([]);
      setCategoriesError(normalizeError(nextError));
    }
  }

  useEffect(() => {
    void loadProducts();
  }, [page, statusFilter]);

  function changeStatusFilter(nextFilter: VendorProductStatusFilter) {
    setStatusFilter(nextFilter);
    setPage(1);
  }

  useEffect(() => {
    if (!initialEditingProductId || !data) {
      return;
    }

    if (data.products.rows.some((product) => product.id === initialEditingProductId)) {
      setEditingProductId(initialEditingProductId);
    }
  }, [data, initialEditingProductId]);

  const productCounts = useMemo(() => {
    return data?.counts ?? {
      all: 0,
      active: 0,
      inactive: 0,
      lowStock: 0,
      outOfStock: 0,
    };
  }, [data]);

  const filteredProducts = useMemo(() => data?.products.rows ?? [], [data]);

  const editingProduct = useMemo(() => {
    if (!data || !editingProductId) {
      return null;
    }

    return data.products.rows.find((product) => String(product.id) === String(editingProductId)) ?? null;
  }, [data, editingProductId]);

  useEffect(() => {
    if (!editingProduct) {
      return;
    }

    editFormRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [editingProduct]);

  async function handleCreateProduct(formData: FormData, imageFile: File | null) {
    if (!data) {
      throw new Error("حساب المتجر غير جاهز بعد.");
    }

    setSaving(true);
    setFeedback(null);

    try {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        parent_category_id: String(formData.get("parent_category_id") ?? ""),
        child_category_id: String(formData.get("child_category_id") ?? ""),
        stock_quantity: String(formData.get("stock_quantity") ?? "0"),
        barcode: String(formData.get("barcode") ?? ""),
        low_stock_threshold: String(
  formData.get("low_stock_threshold") ?? DEFAULT_LOW_STOCK_THRESHOLD,
),
      };
      const validation = validateProductForm(values, categories);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "فشل التحقق من بيانات المنتج.");
      }

      let imageUrl: string | null = null;

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const result = await vendorCreateProductAction({
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        categoryId: validation.payload.category_id,
        imageUrl,
        stockQuantity: validation.payload.stock_quantity,
        barcode: validation.payload.barcode || null,
        lowStockThreshold: validation.payload.low_stock_threshold,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إنشاء المنتج.");
      }

      setFeedback({
        type: "success",
        message: "تم إنشاء المنتج بنجاح.",
      });
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(formData: FormData, imageFile: File | null) {
    if (!data) {
      throw new Error("حساب المتجر غير جاهز بعد.");
    }

    const productId = String(formData.get("product_id") ?? "");
    if (!productId) {
      throw new Error("تعذر تحديد المنتج.");
    }

    setSaving(true);
    setFeedback(null);

    try {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        parent_category_id: String(formData.get("parent_category_id") ?? ""),
        child_category_id: String(formData.get("child_category_id") ?? ""),
        stock_quantity: String(formData.get("stock_quantity") ?? "0"),
        barcode: String(formData.get("barcode") ?? ""),
        low_stock_threshold: String(
  formData.get("low_stock_threshold") ?? DEFAULT_LOW_STOCK_THRESHOLD,
),
      };
      const validation = validateProductForm(values, categories);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "فشل التحقق من بيانات المنتج.");
      }

      const currentProduct = data.products.rows.find((product) => product.id === productId);
      if (!currentProduct) {
        throw new Error("يمكنك تعديل منتجاتك فقط.");
      }

      let imageUrl = currentProduct.image_url;

      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const result = await vendorUpdateProductAction({
        productId,
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        categoryId: validation.payload.category_id,
        stockQuantity: validation.payload.stock_quantity,
        lowStockThreshold: validation.payload.low_stock_threshold,
        barcode: validation.payload.barcode || null,
        imageUrl,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث المنتج.");
      }

      setEditingProductId(null);
      setFeedback({
        type: "success",
        message: "تم تحديث المنتج بنجاح.",
      });
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function activateProduct(productId: string) {
    setDeactivatingId(productId);
    setFeedback(null);

    try {
      const result = await vendorActivateProductAction({ productId });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تفعيل المنتج.");
      }

      setFeedback({
        type: "success",
        message: "تم تفعيل المنتج بنجاح.",
      });

      await loadProducts();
    } catch (nextError) {
      setFeedback({
        type: "error",
        message: normalizeError(nextError),
      });
    } finally {
      setDeactivatingId(null);
    }
  }

  async function deactivateProduct(productId: string) {
    setDeactivatingId(productId);
    setFeedback(null);

    try {
      const result = await vendorDeactivateProductAction({
        productId,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تعطيل المنتج.");
      }

      if (editingProductId === productId) {
        setEditingProductId(null);
      }

      setFeedback({
        type: "success",
        message: "تم تعطيل المنتج بنجاح.",
      });
      await loadProducts();
    } catch (nextError) {
      setFeedback({
        type: "error",
        message: normalizeError(nextError),
      });
    } finally {
      setDeactivatingId(null);
    }
  }

  if (loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل منتجات المتجر..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={error} onRetry={() => void loadProducts()} />
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="medical-panel">
        <EmptyState title="المتجر غير جاهز" message="تعذر تحديد حساب المتجر الخاص بك." />
      </Card>
    );
  }

  return (
    <div className="stack">
      <section className="detail-grid">
        <Card className="medical-panel">
          <div className="detail-meta">
            <div className="detail-block">
              <strong>كل المنتجات</strong>
              <span>{productCounts.all}</span>
            </div>
            <div className="detail-block">
              <strong>نشط</strong>
              <span>{productCounts.active}</span>
            </div>
            <div className="detail-block">
              <strong>غير نشط</strong>
              <span>{productCounts.inactive}</span>
            </div>
            <div className="detail-block">
  <strong>مخزون منخفض</strong>
  <span>{productCounts.lowStock}</span>
</div>
            <div className="detail-block">
              <strong>نفد المخزون</strong>
              <span>{productCounts.outOfStock}</span>
            </div>
          </div>
        </Card>
      </section>
{productCounts.lowStock > 0 ? (
  <Card
    className="medical-panel"
    style={{
      border: "2px solid #DC2626",
      backgroundColor: "#FEF2F2",
    }}
  >
    <h3 style={{ color: "#991B1B", fontWeight: 900 }}>
      ⚠️ تنبيه مخزون منخفض
    </h3>

    <p style={{ color: "#B91C1C", fontWeight: 700 }}>
      لديك {productCounts.lowStock} منتجات تحتاج إعادة تعبئة.
    </p>

    <Button
      type="button"
      className="danger-button"
      onClick={() => changeStatusFilter("low_stock")}
    >
      عرض المنتجات منخفضة المخزون
    </Button>
  </Card>
) : null}
      {categoriesError ? (
        <Card className="medical-panel">
          <ErrorState message={categoriesError} retryLabel="إعادة تحميل الفئات" onRetry={() => void loadCategoriesOnly()} />
        </Card>
      ) : null}

      <BulkProductImportCard categories={categories} onImportComplete={loadProducts} />

      <Card className="medical-panel">
        <div className="split-actions">
          <div>
            <h3 className="order-card-title">إضافة منتج</h3>
          </div>
        </div>
        <VendorProductForm mode="create" categories={categories} loading={saving && !editingProductId} onSubmit={handleCreateProduct} />
      </Card>

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {editingProduct ? (
        <div id="vendor-edit-product-form" ref={editFormRef}>
          <Card className="medical-panel">
            <div className="split-actions">
              <div>
                <h3 className="order-card-title">تعديل المنتج</h3>
                <p className="muted order-card-subtitle">{editingProduct.name}</p>
              </div>
            </div>
            <VendorProductForm
              mode="edit"
              categories={categories}
              product={editingProduct}
              loading={saving && editingProductId === editingProduct.id}
              onSubmit={handleEditProduct}
              onCancel={() => setEditingProductId(null)}
            />
          </Card>
        </div>
      ) : null}

      <Card className="medical-panel">
        <div className="split-actions">
          <div>
            <h3 className="order-card-title">فلاتر الكتالوج</h3>
            <p className="muted order-card-subtitle">تنقّل بين المنتجات النشطة وغير النشطة والمعرّضة لنقص المخزون من الصفحة نفسها.</p>
          </div>
        </div>
        <div className="filter-chip-row">
          <button type="button" className={`filter-chip ${statusFilter === "all" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("all")}>
            <span>الكل</span>
            <strong>{productCounts.all}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "active" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("active")}>
            <span>نشط</span>
            <strong>{productCounts.active}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "inactive" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("inactive")}>
            <span>غير نشط</span>
            <strong>{productCounts.inactive}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "low_stock" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("low_stock")}>
            <span>مخزون منخفض</span>
            <strong>{productCounts.lowStock}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "out_of_stock" ? "filter-chip-active" : ""}`.trim()} onClick={() => changeStatusFilter("out_of_stock")}>
            <span>نفد المخزون</span>
            <strong>{productCounts.outOfStock}</strong>
          </button>
        </div>
      </Card>

<PaginationControls
  totalCount={data.products.totalCount}
  page={data.products.page}
  pageCount={data.products.pageCount}
  onPrevious={() => setPage((current) => Math.max(1, current - 1))}
  onNext={() => setPage((current) => Math.min(data.products.pageCount, current + 1))}
/>

{data.products.totalCount === 0 ? (
  <Card className="medical-panel">
    <EmptyState
      title="لا توجد منتجات بعد"
      message="كتالوج المتجر فارغ حاليًا."
    />
  </Card>
) : filteredProducts.length === 0 ? (
  <Card className="medical-panel">
    <EmptyState
      title="لا توجد نتائج"
      message="لا توجد منتجات تطابق الفلتر الحالي."
    />
  </Card>
) : (
  <div className="compact-inventory-table">
    <div className="inventory-clean-header product-clean-row">
      <span>المنتج</span>
      <span>الصورة</span>
      <span>السعر</span>
      <span>المخزون</span>
      <span>الحالة</span>
      <span>الإجراءات</span>
    </div>

    {filteredProducts.map((product) => {
      const threshold =
        product.low_stock_threshold ??
        DEFAULT_LOW_STOCK_THRESHOLD;

      const isOut = product.stock_quantity <= 0;

      const isLow =
        product.is_active &&
        product.stock_quantity > 0 &&
        product.stock_quantity <= threshold;

      return (
        <div
          key={product.id}
          className="inventory-clean-row product-clean-row"
        >
          <div>
            <strong>{product.name}</strong>

            <p className="muted">
              {getCategoryPathDisplayName(
                categories,
                product.category_id,
              )}
            </p>

            {product.description ? (
              <p
                className="muted"
                style={{
                  marginTop: 2,
                  display: "-webkit-box",
                  WebkitLineClamp: 1,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  maxWidth: 220,
                }}
              >
                {product.description}
              </p>
            ) : null}

            {product.barcode ? (
              <p className="muted">
    باركود: {product.barcode}
  </p>
) : null}
          </div>

          <div className="product-clean-image">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
              />
            ) : (
              <span>💊</span>
            )}
          </div>

          <span>
            {formatCurrency(product.price)}
          </span>

          <span
            className="inventory-qty"
            style={{
              color: isOut
                ? "#DC2626"
                : isLow
                  ? "#D97706"
                  : "#166534",
              fontWeight: 800,
            }}
          >
            {product.stock_quantity}
          </span>

          <span
            className={
              isOut
                ? "inventory-pill danger-pill"
                : isLow
                  ? "inventory-pill warning-pill"
                  : product.is_active
                    ? "inventory-pill success-pill"
                    : "inventory-pill muted-pill"
            }
          >
            {isOut
              ? "نافد"
              : isLow
                ? "منخفض"
                : product.is_active
                  ? "نشط"
                  : "غير نشط"}
          </span>

          <div
            className="table-actions"
            style={{ pointerEvents: "auto" }}
          >
            <Button
              type="button"
              className="secondary-button"
              onClick={() =>
                setEditingProductId(String(product.id))
              }
              disabled={
                saving ||
                deactivatingId === product.id
              }
            >
              تعديل
            </Button>

            {product.is_active ? (
              <Button
                type="button"
                className="danger-button"
                disabled={
                  deactivatingId === product.id ||
                  saving
                }
                onClick={() =>
                  void deactivateProduct(product.id)
                }
              >
                {deactivatingId === product.id
                  ? "..."
                  : "تعطيل"}
              </Button>
            ) : (
              <Button
                type="button"
                className="secondary-button"
                disabled={
                  deactivatingId === product.id ||
                  saving
                }
                onClick={() =>
                  void activateProduct(product.id)
                }
              >
                {deactivatingId === product.id
                  ? "..."
                  : "تفعيل"}
              </Button>
            )}
          </div>
        </div>
      );
    })}
  </div>
)}

    </div>
  );
}

function PaginationControls({
  totalCount,
  page,
  pageCount,
  onPrevious,
  onNext,
}: {
  totalCount: number;
  page: number;
  pageCount: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <Card className="medical-panel">
      <div className="split-actions">
        <p className="muted">الإجمالي: {totalCount} · الصفحة {page} من {pageCount}</p>
        <div className="inline-actions">
          <button className="secondary-button" type="button" disabled={page <= 1} onClick={onPrevious}>
            السابق
          </button>
          <button className="secondary-button" type="button" disabled={page >= pageCount} onClick={onNext}>
            التالي
          </button>
        </div>
      </div>
    </Card>
  );
}
