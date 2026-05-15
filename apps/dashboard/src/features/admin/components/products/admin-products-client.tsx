"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { Button } from "../../../../components/ui/button";
import { Card } from "../../../../components/ui/card";
import { EmptyState } from "../../../../components/ui/empty-state";
import { ErrorState } from "../../../../components/ui/error-state";
import { Input } from "../../../../components/ui/input";
import { LoadingState } from "../../../../components/ui/loading-state";
import { Table } from "../../../../components/ui/table";
import { useLocale } from "../../../../lib/i18n/locale-context";
import { getSupabaseBrowserClient } from "../../../../lib/supabase/browser";
import { formatCurrency } from "../../../../lib/utils/format-currency";
import type { ProductCategoryOption, ProductRow } from "../../../../types/dashboard";
import {
  getCategoryOptionLabel,
  getCategoryPathDisplayName,
  getChildCategoryOptions,
  getProductCategorySelection,
  getSubmittedProductCategoryId,
  getTopLevelCategoryOptions,
} from "../../../products/category-options";
import {
  adminCreateProductAction,
  adminDeactivateProductAction,
  adminUpdateProductAction,
} from "../../actions";
import type { AdminProductManagerData, AsyncState, ProductFormValues } from "../shared/admin-types";
import { normalizeError } from "../shared/admin-utils";

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

async function loadAdminProductManagerData(): Promise<AdminProductManagerData> {
  const supabase = getSupabaseBrowserClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase
      .from("categories")
      .select("id, name, name_ar, slug, icon, image_url, sort_order, is_active, parent_id, created_at")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
      .from("products")
      .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  if (categoriesResult.error) {
    throw categoriesResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  return {
    categories: (categoriesResult.data ?? []).map((category) => ({
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
    })),
    products: (productsResult.data ?? []).map((product) =>
      mapProductRow(product as Record<string, unknown>)
    ),
  };
}

async function resolveDefaultVendorId() {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("vendors").select("id").order("created_at", { ascending: true }).limit(1).maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id ? String(data.id) : null;
}

function buildInitialProductFormValuesWithCategories(product: ProductRow | null | undefined, categories: ProductCategoryOption[]): ProductFormValues {
  const selection = getProductCategorySelection(categories, product?.category_id);

  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    parent_category_id: selection.parentCategoryId,
    child_category_id: selection.childCategoryId,
  };
}

function validateProductForm(values: ProductFormValues, categories: ProductCategoryOption[]) {
  const name = values.name.trim();
  const description = values.description.trim();
  const price = Number(values.price);
  const categoryId = getSubmittedProductCategoryId(values, categories);

  if (!name || !description || !values.price || !categoryId) {
    return { error: "يرجى إكمال جميع الحقول المطلوبة." };
  }

  if (Number.isNaN(price) || price <= 0) {
    return { error: "يجب أن يكون السعر أكبر من 0." };
  }

  return {
    error: null,
    payload: {
      name,
      description,
      price,
      category_id: categoryId,
    },
  };
}

async function uploadAdminProductImage(file: File) {
  const supabase = getSupabaseBrowserClient();
  const extension = file.name.split(".").pop() ?? "jpg";
  const path = `products/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

function AdminProductForm({
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
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useLocale();
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);
  const [values, setValues] = useState<ProductFormValues>(buildInitialProductFormValuesWithCategories(product, categories));

  useEffect(() => {
    setValues(buildInitialProductFormValuesWithCategories(product, categories));
    setMessage(null);
    setMessageType(null);
  }, [categories, product, mode]);

  const topLevelCategories = getTopLevelCategoryOptions(categories);
  const childCategories = getChildCategoryOptions(categories, values.parent_category_id);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValues = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: String(formData.get("price") ?? ""),
      parent_category_id: String(formData.get("parent_category_id") ?? ""),
      child_category_id: String(formData.get("child_category_id") ?? ""),
    };

    setValues(nextValues);

    const validation = validateProductForm(nextValues, categories);
    if (validation.error) {
      setMessage(validation.error);
      setMessageType("error");
      return;
    }

    try {
      await onSubmit(formData);
      setMessage(mode === "create" ? "تم إنشاء المنتج بنجاح." : "تم تحديث المنتج بنجاح.");
      setMessageType("success");

      if (mode === "create") {
        setValues(buildInitialProductFormValuesWithCategories(null, categories));
        event.currentTarget.reset();
      }
    } catch (error) {
      setMessage(normalizeError(error));
      setMessageType("error");
    }
  }

  return (
    <Card className="medical-panel">
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
            placeholder={t("وصف مختصر للمنتج")}
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
          <label htmlFor={`${mode}-image`}>{t("Image Upload")}</label>
          <input id={`${mode}-image`} name="image" type="file" accept="image/*" className="input" />
          {product?.image_url ? <p className="muted">{t("Current image saved in Supabase storage.")}</p> : null}
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
    </Card>
  );
}

function AdminProductsManager() {
  const [state, setState] = useState<AsyncState<AdminProductManagerData>>({
    data: null,
    error: null,
    loading: true,
  });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminProductManagerData();
      setState({
        data,
        error: null,
        loading: false,
      });
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreateProduct(formData: FormData) {
    setSaving(true);
    setFeedback(null);

    try {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        parent_category_id: String(formData.get("parent_category_id") ?? ""),
        child_category_id: String(formData.get("child_category_id") ?? ""),
      };
      const validation = validateProductForm(values, state.data?.categories ?? []);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "فشل التحقق من بيانات المنتج.");
      }

      const vendorId = await resolveDefaultVendorId();
      if (!vendorId) {
        throw new Error("أنشئ متجرًا أولًا قبل إضافة منتجات الإدارة.");
      }

      const image = formData.get("image");
      if (!(image instanceof File) || image.size === 0) {
        throw new Error("يرجى رفع صورة للمنتج.");
      }

      const imageUrl = await uploadAdminProductImage(image);
      const result = await adminCreateProductAction({
        vendorId,
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        categoryId: validation.payload.category_id,
        imageUrl,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إنشاء المنتج.");
      }

      setFeedback({
        type: "success",
        message: "تم إنشاء المنتج بنجاح.",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(formData: FormData) {
    const productId = String(formData.get("product_id") ?? "");
    if (!productId) {
      throw new Error("تعذر تحديد المنتج المطلوب للتعديل.");
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
      };
      const validation = validateProductForm(values, state.data?.categories ?? []);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "فشل التحقق من بيانات المنتج.");
      }

      const currentProduct = state.data?.products.find((product) => product.id === productId) ?? null;
      let imageUrl = currentProduct?.image_url ?? null;
      const image = formData.get("image");

      if (image instanceof File && image.size > 0) {
        imageUrl = await uploadAdminProductImage(image);
      }

      const result = await adminUpdateProductAction({
        productId,
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        categoryId: validation.payload.category_id,
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
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteProduct(productId: string) {
    setDeletingId(productId);
    setFeedback(null);

    try {
      const result = await adminDeactivateProductAction({
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
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setDeletingId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل إدارة المنتجات..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => void load()} />
      </Card>
    );
  }

  const categories = state.data?.categories ?? [];
  const products = state.data?.products ?? [];
  const editingProduct = products.find((product) => product.id === editingProductId) ?? null;

  return (
    <div className="stack">
      <AdminProductForm mode="create" categories={categories} loading={saving && !editingProductId} onSubmit={handleCreateProduct} />

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {editingProduct ? (
        <AdminProductForm
          mode="edit"
          categories={categories}
          product={editingProduct}
          loading={saving && editingProductId === editingProduct.id}
          onSubmit={handleEditProduct}
          onCancel={() => setEditingProductId(null)}
        />
      ) : null}

      {products.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد منتجات بعد" message="أنشئ أول منتج تديره الإدارة لتعبئة هذا الكتالوج." />
        </Card>
      ) : (
        <Table
          title="المنتجات"
          headers={["الاسم", "الفئة", "السعر", "الإجراءات"]}
          rows={products.map((product) => [
            product.name,
            getCategoryPathDisplayName(categories, product.category_id),
            `${formatCurrency(product.price)}${product.image_url ? " • الصورة جاهزة" : " • لا توجد صورة"}`,
            <div key={`${product.id}-actions`} className="table-actions">
              <Button className="secondary-button" onClick={() => setEditingProductId(product.id)} disabled={saving || deletingId === product.id}>
                تعديل
              </Button>
              <Button
                className="danger-button"
                onClick={() => void handleDeleteProduct(product.id)}
                disabled={saving || deletingId === product.id}
              >
                {deletingId === product.id ? "جارٍ التعطيل..." : "تعطيل"}
              </Button>
            </div>,
          ])}
          emptyMessage="لم تتم إضافة أي منتجات بعد."
        />
      )}
    </div>
  );
}

export function AdminProductsClient() {
  return <AdminProductsManager />;
}
