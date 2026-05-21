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
  products: ProductRow[];
};

type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  parent_category_id: string;
  child_category_id: string;
  stock_quantity: string;
};

const emptyFormValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  parent_category_id: "",
  child_category_id: "",
  stock_quantity: "0",
};

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
    image_url: product.resolved_image_url
  ? String(product.resolved_image_url)
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
  };
}

function validateProductForm(values: ProductFormValues, categories: ProductCategoryOption[]) {
  const name = values.name.trim();
  const description = values.description.trim();
  const price = Number(values.price);
  const stockQuantity = values.stock_quantity.trim() ? Number(values.stock_quantity) : 0;
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

  return {
    error: null,
    payload: {
      name,
      description,
      price,
      category_id: categoryId,
      stock_quantity: stockQuantity,
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

async function loadVendorProductsData(): Promise<VendorProductsData> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    throw new Error("حساب المتجر غير مرتبط بشكل صحيح.");
  }

  const { data: productsData, error: productsError } = await supabase
    .from("products_with_global_images")
.select(`
  id,
  vendor_id,
  category_id,
  name,
  description,
  price,
  stock_quantity,
  barcode,
  is_active,
  image_url,
  resolved_image_url
`)
    .eq("vendor_id", vendorId)
    .order("created_at", { ascending: false });

  if (productsError) {
    throw productsError;
  }

  return {
    vendorId: String(vendorId),
    products: (productsData ?? []).map((product) => mapProductRow(product as Record<string, unknown>)),
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
        <label htmlFor={`${mode}-name`}>{t("Name")}</label>
        <Input
          id={`${mode}-name`}
          name="name"
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="باراسيتامول 500 مجم"
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${mode}-description`}>{t("Description")}</label>
        <textarea
          id={`${mode}-description`}
          name="description"
          className="textarea"
          rows={4}
          value={values.description}
          onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
          placeholder={t("Product description")}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${mode}-price`}>{t("Price")}</label>
        <Input
          id={`${mode}-price`}
          name="price"
          type="number"
          min="0.01"
          step="0.01"
          value={values.price}
          onChange={(event) => setValues((current) => ({ ...current, price: event.target.value }))}
          required
        />
      </div>
      <div className="field">
        <label htmlFor={`${mode}-category`}>{t("Category")}</label>
        <select
          id={`${mode}-category`}
          name="parent_category_id"
          className="input"
          value={values.parent_category_id}
          onChange={(event) => setValues((current) => ({ ...current, parent_category_id: event.target.value, child_category_id: "" }))}
          required
        >
            <option value="">{t("Select category")}</option>
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
          <label htmlFor={`${mode}-subcategory`}>الفئة الفرعية</label>
          <select
            id={`${mode}-subcategory`}
            name="child_category_id"
            className="input"
            value={values.child_category_id}
            onChange={(event) => setValues((current) => ({ ...current, child_category_id: event.target.value }))}
            required
          >
            <option value="">اختر الفئة الفرعية</option>
            {childCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {getCategoryPathDisplayName(categories, category.id)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="field">
        <label htmlFor={`${mode}-stock`}>{t("Stock Quantity")}</label>
        <Input
          id={`${mode}-stock`}
          name="stock_quantity"
          type="number"
          min="0"
          step="1"
          value={values.stock_quantity}
          onChange={(event) => setValues((current) => ({ ...current, stock_quantity: event.target.value }))}
        />
      </div>
      <div className="field">
        <label htmlFor={`${mode}-image`}>{t("Image Upload")}</label>
        <input
  id={`${mode}-image`}
  type="file"
  accept="image/*"
  className="input"
  onChange={(event) => {
    const file = event.target.files?.[0] ?? null;

    setImageFile(file);

    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    } else {
      setPreviewUrl(product?.image_url ?? null);
    }
  }}
/>
{previewUrl ? (
  <div
    style={{
      marginTop: 12,
      display: "flex",
      justifyContent: "flex-start",
    }}
  >
    <img
      src={previewUrl}
      alt="معاينة المنتج"
      style={{
        width: 120,
        height: 120,
        objectFit: "cover",
        borderRadius: 16,
        border: "1px solid #DCEBDF",
        backgroundColor: "#F8FCF8",
      }}
    />
  </div>
) : null}
        {product?.image_url ? <p className="muted">{t("Current image saved in Supabase storage.")}</p> : <p className="muted">{t("Image upload is optional.")}</p>}
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
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "low_stock" | "out_of_stock">("all");
  const editFormRef = useRef<HTMLDivElement | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    setCategoriesError(null);

    try {
      const nextData = await loadVendorProductsData();
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
  }, []);

  useEffect(() => {
    if (!initialEditingProductId || !data) {
      return;
    }

    if (data.products.some((product) => product.id === initialEditingProductId)) {
      setEditingProductId(initialEditingProductId);
    }
  }, [data, initialEditingProductId]);

  const productCounts = useMemo(() => {
    const products = data?.products ?? [];

    return {
      all: products.length,
      active: products.filter((product) => product.is_active).length,
      inactive: products.filter((product) => !product.is_active).length,
      lowStock: products.filter((product) => product.is_active && product.stock_quantity > 0 && product.stock_quantity <= 10).length,
      outOfStock: products.filter((product) => product.is_active && product.stock_quantity <= 0).length,
    };
  }, [data]);

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];

    switch (statusFilter) {
      case "active":
        return products.filter((product) => product.is_active);
      case "inactive":
        return products.filter((product) => !product.is_active);
      case "low_stock":
        return products.filter((product) => product.is_active && product.stock_quantity > 0 && product.stock_quantity <= 10);
      case "out_of_stock":
        return products.filter((product) => product.is_active && product.stock_quantity <= 0);
      default:
        return products;
    }
  }, [data, statusFilter]);

  const editingProduct = useMemo(() => {
    if (!data || !editingProductId) {
      return null;
    }

    return data.products.find((product) => String(product.id) === String(editingProductId)) ?? null;
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
      };
      const validation = validateProductForm(values, categories);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "فشل التحقق من بيانات المنتج.");
      }

      const currentProduct = data.products.find((product) => product.id === productId);
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
              <strong>نفد المخزون</strong>
              <span>{productCounts.outOfStock}</span>
            </div>
          </div>
        </Card>
      </section>

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
            <p className="muted order-card-subtitle">أضف منتجًا جديدًا مع السعر والكمية والفئة والصورة الاختيارية.</p>
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
          <button type="button" className={`filter-chip ${statusFilter === "all" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("all")}>
            <span>الكل</span>
            <strong>{productCounts.all}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "active" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("active")}>
            <span>نشط</span>
            <strong>{productCounts.active}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "inactive" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("inactive")}>
            <span>غير نشط</span>
            <strong>{productCounts.inactive}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "low_stock" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("low_stock")}>
            <span>مخزون منخفض</span>
            <strong>{productCounts.lowStock}</strong>
          </button>
          <button type="button" className={`filter-chip ${statusFilter === "out_of_stock" ? "filter-chip-active" : ""}`.trim()} onClick={() => setStatusFilter("out_of_stock")}>
            <span>نفد المخزون</span>
            <strong>{productCounts.outOfStock}</strong>
          </button>
        </div>
      </Card>

      {data.products.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد منتجات بعد" message="كتالوج المتجر فارغ حاليًا." />
        </Card>
      ) : (
        <Table
          title="المنتجات"
          headers={["الاسم", "الفئة", "السعر", "الكمية", "الحالة", "الصورة", "الإجراءات"]}
          rows={filteredProducts.map((product) => [
            <div key={`${product.id}-name`} className="stack compact-stack">
              <strong>{product.name}</strong>
              {product.description ? <span className="muted">{product.description}</span> : null}
            </div>,
            getCategoryPathDisplayName(categories, product.category_id),
            formatCurrency(product.price),
            `${product.stock_quantity}`,
            <Badge key={`${product.id}-status`} className={product.is_active ? "status-delivered" : "status-cancelled"}>
              {product.is_active ? "نشط" : "غير نشط"}
            </Badge>,
            product.image_url ? (
              <a
                key={`${product.id}-image`}
                href={product.image_url}
                target="_blank"
                rel="noreferrer"
                className="inline-link"
                aria-label={`فتح صورة ${product.name}`}
                style={{ display: "inline-flex" }}
              >
                <img
                  src={product.image_url}
                  alt={product.name}
                  style={{
                    width: 56,
                    height: 56,
                    objectFit: "contain",
                    padding: 4,
                    borderRadius: 12,
                    border: "1px solid #DCEBDF",
                    backgroundColor: "#F8FCF8",
                  }}
                />
              </a>
            ) : (
              "لا توجد صورة"
            ),
            <div key={`${product.id}-actions`} className="table-actions" style={{ pointerEvents: "auto" }}>
              <Button
                type="button"
                className="secondary-button"
                onClick={() => setEditingProductId(String(product.id))}
                disabled={saving || deactivatingId === product.id}
              >
                تعديل
              </Button>

              {product.is_active ? (
                <Button
                  type="button"
                  className="danger-button"
                  disabled={deactivatingId === product.id || saving}
                  onClick={() => void deactivateProduct(product.id)}
                >
                  {deactivatingId === product.id ? "جارٍ التعطيل..." : "تعطيل"}
                </Button>
              ) : (
                <Button
                  type="button"
                  className="secondary-button"
                  disabled={deactivatingId === product.id || saving}
                  onClick={() => void activateProduct(product.id)}
                >
                  {deactivatingId === product.id ? "جارٍ التفعيل..." : "تفعيل"}
                </Button>
              )}
            </div>
          ])}
          emptyMessage="لا توجد منتجات تطابق الفلتر الحالي."
        />
      )}
    </div>
  );
}
