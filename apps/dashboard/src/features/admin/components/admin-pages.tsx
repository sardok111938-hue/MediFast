"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { formatCategoryLabel } from "@medifast/i18n";
import { formatPaymentStatusLabel } from "@medifast/types";
import { Input } from "../../../components/ui/input";
import { Card } from "../../../components/ui/card";
import { LoadingState } from "../../../components/ui/loading-state";
import { EmptyState } from "../../../components/ui/empty-state";
import { ErrorState } from "../../../components/ui/error-state";
import { Table } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Badge } from "../../../components/ui/badge";
import { StatCard } from "../../../components/ui/stat-card";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { useLocale } from "../../../lib/i18n/locale-context";
import { formatCurrency } from "../../../lib/utils/format-currency";
import { formatDate } from "../../../lib/utils/format-date";
import {
  adminCreateCategoryAction,
  adminCreateProductAction,
  adminDeactivateProductAction,
  adminDeleteCategoryAction,
  adminUpdateCategoryAction,
  adminUpdateDriverAction,
  adminUpdateProductAction,
  adminUpdateVendorAction,
} from "../actions";
import { assignDriverAction, updateAdminOrderStatusAction } from "../../orders/actions";
import { OrderStatusBadge } from "../../orders/components/order-status-badge";
import type { ProductCategoryOption, ProductRow } from "../../../types/dashboard";

type TableModel = {
  title: string;
  headers: string[];
  rows: ReactNode[][];
};

type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

type OverviewData = {
  stats: {
    label: string;
    value: string;
    hint: string;
  }[];
  ordersTable: TableModel;
  productsTable: TableModel;
};

type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  category_id: string;
};

type AdminProductManagerData = {
  categories: ProductCategoryOption[];
  products: ProductRow[];
};

type AdminOrderManagerRow = {
  id: string;
  customerName: string;
  vendorName: string;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  createdAt: string;
  driverId: string | null;
  driverName: string;
};

type DriverOption = {
  id: string;
  fullName: string;
};

type AdminVendorRow = {
  id: string;
  name: string;
  approvalStatus: string;
  isActive: boolean;
  address: string;
};

type AdminDriverRow = {
  id: string;
  fullName: string;
  approvalStatus: string;
  isAvailable: boolean;
  currentLat: number | null;
  currentLng: number | null;
};

type AdminCustomerRow = {
  id: string;
  fullName: string;
  phone: string | null;
  createdAt: string;
};

type AdminCategoryRow = {
  id: string;
  name: string;
  nameAr: string | null;
  displayName: string;
  createdAt: string;
};

type CategoryFormValues = {
  name: string;
  nameAr: string;
};

const orderStatusOptions = [
  "placed",
  "accepted",
  "preparing",
  "rejected",
  "ready_for_pickup",
  "assigned",
  "on_the_way",
  "delivered",
  "cancelled",
] as const;

function readSingle<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function readName(value: { full_name?: string } | { full_name?: string }[] | null | undefined, fallback: string) {
  return readSingle(value)?.full_name ?? fallback;
}

function readCategoryName(value: { name?: string; name_ar?: string | null } | { name?: string; name_ar?: string | null }[] | null | undefined) {
  const record = readSingle(value);
  return formatCategoryLabel(record) || "-";
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "تعذر تحميل بيانات لوحة التحكم الآن.";
}

async function fetchCount(table: string) {
  const supabase = getSupabaseBrowserClient();
  const { count, error } = await supabase.from(table).select("*", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function loadOverviewData(): Promise<OverviewData> {
  const supabase = getSupabaseBrowserClient();
  const [vendorsCount, driversCount, customersCount, productsCount, categoriesCount, ordersCount, ordersResult, productsResult] =
    await Promise.all([
      fetchCount("vendors"),
      fetchCount("drivers"),
      fetchCount("customers"),
      fetchCount("products"),
      fetchCount("categories"),
      fetchCount("orders"),
      supabase
        .from("orders")
        .select(`
          id,
          order_status,
          total,
          created_at,
          vendor:vendors(name),
          customer:customers(
            profile:profiles(full_name)
          )
        `)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("products")
        .select(`
          id,
          name,
          price,
          stock_quantity,
          is_active,
          category:categories(name, name_ar)
        `)
  .eq("is_active", true)
  .order("created_at", { ascending: false })
  .limit(5)
    ]);

  if (ordersResult.error) {
    throw ordersResult.error;
  }

  if (productsResult.error) {
    throw productsResult.error;
  }

  return {
    stats: [
      { label: "المتاجر", value: `${vendorsCount}`, hint: "شركاء الصيدليات النشطون في السوق" },
      { label: "السائقون", value: `${driversCount}`, hint: "حسابات التوصيل المتاحة للتشغيل" },
      { label: "العملاء", value: `${customersCount}`, hint: "ملفات جاهزة لطلبات متكررة" },
      { label: "المنتجات", value: `${productsCount}`, hint: "عناصر الكتالوج المتزامنة من Supabase" },
      { label: "الفئات", value: `${categoriesCount}`, hint: "حالة تنظيم الكتالوج" },
      { label: "الطلبات", value: `${ordersCount}`, hint: "إجمالي سجلات الطلبات المتعقبة" },
    ],
    ordersTable: {
      title: "أحدث الطلبات",
      headers: ["الطلب", "العميل", "المتجر", "الحالة"],
      rows: (ordersResult.data ?? []).map((order) => [
        String(order.id),
        readName((readSingle(order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile), "العميل"),
        readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null),
        <OrderStatusBadge key={`overview-order-${order.id}`} status={String(order.order_status)} />,
      ]),
    },
    productsTable: {
      title: "أحدث المنتجات",
      headers: ["المنتج", "الفئة", "السعر", "المخزون"],
      rows: (productsResult.data ?? []).map((product) => [
        String(product.name),
        readCategoryName(product.category as { name?: string } | { name?: string }[] | null),
        formatCurrency(Number(product.price ?? 0)),
        `${Number(product.stock_quantity ?? 0)}`,
      ]),
    },
  };
}

async function loadVendorsTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, address_line_1, area, city, approval_status, is_active")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "المتاجر",
    headers: ["الاسم", "العنوان", "الموافقة", "الحالة"],
    rows: (data ?? []).map((vendor) => [
      String(vendor.name),
      [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join("، ") || "-",
      String(vendor.approval_status),
      vendor.is_active ? "نشط" : "مغلق",
    ]),
  };
}

async function loadDriversTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      is_available,
      approval_status,
      current_lat,
      current_lng,
      profile:profiles(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "السائقون",
    headers: ["السائق", "التوفر", "الموافقة", "الموقع"],
    rows: (data ?? []).map((driver) => [
      readName(driver.profile as { full_name?: string } | { full_name?: string }[] | null, "السائق"),
      driver.is_available ? "نعم" : "لا",
      String(driver.approval_status),
      `${driver.current_lat ?? "-"}, ${driver.current_lng ?? "-"}`,
    ]),
  };
}

async function loadCustomersTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .select(`
      id,
      created_at,
      profile:profiles(full_name, phone)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "العملاء",
    headers: ["العميل", "الهاتف", "تاريخ الانضمام", "الحالة"],
    rows: (data ?? []).map((customer) => {
      const profile = readSingle(customer.profile as { full_name?: string; phone?: string | null } | { full_name?: string; phone?: string | null }[] | null);

      return [
        profile?.full_name ?? "العميل",
        profile?.phone ?? "-",
        customer.created_at ? formatDate(String(customer.created_at)) : "-",
        "نشط",
      ];
    }),
  };
}

async function loadCategoriesTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ar, icon, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    title: "الفئات",
    headers: ["الاسم العربي", "الاسم الداخلي", "تاريخ الإنشاء", "حالة الكتالوج"],
    rows: (data ?? []).map((category) => [
      formatCategoryLabel({
        name: String(category.name),
        name_ar: category.name_ar ? String(category.name_ar) : null,
      }) || "-",
      String(category.name),
      category.created_at ? formatDate(String(category.created_at)) : "-",
      "نشط",
    ]),
  };
}

async function loadProductsTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      price,
      stock_quantity,
      is_active,
      vendor:vendors(name),
      category:categories(name, name_ar)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "المنتجات",
    headers: ["الاسم", "المتجر", "الفئة", "السعر"],
    rows: (data ?? []).map((product) => [
      String(product.name),
      readCategoryName(product.vendor as { name?: string } | { name?: string }[] | null),
      readCategoryName(product.category as { name?: string } | { name?: string }[] | null),
      `${formatCurrency(Number(product.price ?? 0))} • المخزون ${Number(product.stock_quantity ?? 0)} • ${product.is_active ? "نشط" : "غير نشط"}`,
    ]),
  };
}

async function loadAdminVendorsData(): Promise<AdminVendorRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("id, name, approval_status, is_active, address_line_1, area, city")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((vendor) => ({
    id: String(vendor.id),
    name: String(vendor.name),
    approvalStatus: String(vendor.approval_status),
    isActive: Boolean(vendor.is_active),
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join("، ") || "-",
  }));
}

async function loadAdminDriversData(): Promise<AdminDriverRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      approval_status,
      is_available,
      current_lat,
      current_lng,
      profile:profiles!drivers_user_id_fkey(full_name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((driver) => ({
    id: String(driver.id),
    fullName: readName(driver.profile as { full_name?: string } | { full_name?: string }[] | null, "السائق"),
    approvalStatus: String(driver.approval_status),
    isAvailable: Boolean(driver.is_available),
    currentLat: driver.current_lat == null ? null : Number(driver.current_lat),
    currentLng: driver.current_lng == null ? null : Number(driver.current_lng),
  }));
}

async function loadAdminCustomersData(): Promise<AdminCustomerRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("customers")
    .select(`
      id,
      created_at,
      profile:profiles!customers_user_id_fkey(full_name, phone)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((customer) => {
    const profile = readSingle(customer.profile as { full_name?: string; phone?: string | null } | { full_name?: string; phone?: string | null }[] | null);

    return {
      id: String(customer.id),
      fullName: profile?.full_name ?? "العميل",
      phone: profile?.phone ?? null,
      createdAt: String(customer.created_at ?? ""),
    };
  });
}

async function loadAdminCategoriesData(): Promise<AdminCategoryRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, name_ar, icon, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: String(category.id),
    name: String(category.name),
    nameAr: category.name_ar ? String(category.name_ar) : null,
    displayName: formatCategoryLabel({
      name: String(category.name),
      name_ar: category.name_ar ? String(category.name_ar) : null,
    }),
    createdAt: String(category.created_at ?? ""),
  }));
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

async function loadAdminProductManagerData(): Promise<AdminProductManagerData> {
  const supabase = getSupabaseBrowserClient();

  const [categoriesResult, productsResult] = await Promise.all([
    supabase.from("categories").select("id, name, name_ar, icon").order("name", { ascending: true }),
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

function buildInitialProductFormValues(product?: ProductRow | null): ProductFormValues {
  return {
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    category_id: product?.category_id ?? "",
  };
}

function validateProductForm(values: ProductFormValues) {
  const name = values.name.trim();
  const description = values.description.trim();
  const price = Number(values.price);
  const categoryId = values.category_id.trim();

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
  const [values, setValues] = useState<ProductFormValues>(buildInitialProductFormValues(product));

  useEffect(() => {
    setValues(buildInitialProductFormValues(product));
    setMessage(null);
    setMessageType(null);
  }, [product, mode]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextValues = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: String(formData.get("price") ?? ""),
      category_id: String(formData.get("category_id") ?? ""),
    };

    setValues(nextValues);

    const validation = validateProductForm(nextValues);
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
        setValues(buildInitialProductFormValues());
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
            name="category_id"
            className="input"
            value={values.category_id}
            onChange={(event) => setValues((current) => ({ ...current, category_id: event.target.value }))}
            required
          >
            <option value="">{t("Select category")}</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.display_name}
              </option>
            ))}
          </select>
        </div>
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
        category_id: String(formData.get("category_id") ?? ""),
      };
      const validation = validateProductForm(values);

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
        category_id: String(formData.get("category_id") ?? ""),
      };
      const validation = validateProductForm(values);

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
            categories.find((category) => category.id === product.category_id)?.display_name ?? "-",
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

async function loadOrdersTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      payment_method,
      payment_status,
      order_status,
      total,
      created_at,
      vendor:vendors(name),
      customer:customers(
        profile:profiles(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "الطلبات",
    headers: ["الطلب", "العميل", "الدفع", "الحالة"],
    rows: (data ?? []).map((order) => [
      `${String(order.id)} • ${readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null)}`,
      readName((readSingle(order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile), "العميل"),
      `${String(order.payment_method)} • ${formatPaymentStatusLabel(String(order.payment_status), String(order.payment_method))} • ${formatCurrency(Number(order.total ?? 0))}`,
      <OrderStatusBadge key={`order-${order.id}`} status={String(order.order_status)} />,
    ]),
  };
}

async function loadAdminOrdersData(): Promise<AdminOrderManagerRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      driver_id,
      total,
      payment_method,
      payment_status,
      order_status,
      created_at,
      vendor:vendors(name),
      customer:customers(
        profile:profiles(full_name)
      ),
      driver:drivers(
        profile:profiles!drivers_user_id_fkey(full_name)
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((order) => ({
    id: String(order.id),
    customerName: readName(
      readSingle((order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile),
      "العميل"
    ),
    vendorName: readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null),
    total: Number(order.total ?? 0),
    paymentMethod: String(order.payment_method ?? ""),
    paymentStatus: String(order.payment_status),
    orderStatus: String(order.order_status),
    createdAt: String(order.created_at ?? ""),
    driverId: order.driver_id ? String(order.driver_id) : null,
    driverName: readName(
      readSingle((order.driver as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile),
      "غير معيّن"
    ),
  }));
}

async function loadAvailableDrivers(): Promise<DriverOption[]> {
  const supabase = getSupabaseBrowserClient();

  const { data, error } = await supabase
    .from("drivers")
    .select(`
      id,
      profiles!drivers_user_id_fkey(full_name)
    `)
    .eq("is_available", true)
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((driver) => {
    const profile = readSingle(
      driver.profiles as { full_name?: string } | { full_name?: string }[] | null
    );

    return {
      id: String(driver.id),
      fullName: profile?.full_name ?? "السائق",
    };
  });
}

function ResourceTable({
  load,
  loadingMessage,
  emptyMessage,
}: {
  load: () => Promise<TableModel>;
  loadingMessage: string;
  emptyMessage: string;
}) {
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AsyncState<TableModel>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState({
        data: null,
        error: null,
        loading: true,
      });

      try {
        const data = await load();

        if (!active) {
          return;
        }

        setState({
          data,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          error: normalizeError(error),
          loading: false,
        });
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [load, reloadKey]);

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message={loadingMessage} />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => setReloadKey((value) => value + 1)} />
      </Card>
    );
  }

  if (!state.data || state.data.rows.length === 0) {
    return (
      <Card className="medical-panel">
        <EmptyState title="لا يوجد ما يمكن مراجعته" message={emptyMessage} />
      </Card>
    );
  }

  return <Table title={state.data.title} headers={state.data.headers} rows={state.data.rows} emptyMessage={emptyMessage} />;
}

function OverviewContent() {
  const { t } = useLocale();
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<AsyncState<OverviewData>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let active = true;

    async function run() {
      setState({
        data: null,
        error: null,
        loading: true,
      });

      try {
        const data = await loadOverviewData();

        if (!active) {
          return;
        }

        setState({
          data,
          error: null,
          loading: false,
        });
      } catch (error) {
        if (!active) {
          return;
        }

        setState({
          data: null,
          error: normalizeError(error),
          loading: false,
        });
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [reloadKey]);

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل نظرة الإدارة العامة..." />
      </Card>
    );
  }

  if (state.error) {
    return (
      <Card className="medical-panel">
        <ErrorState message={state.error} onRetry={() => setReloadKey((value) => value + 1)} />
      </Card>
    );
  }

  if (!state.data) {
    return (
      <Card className="medical-panel">
        <EmptyState title="لا توجد بيانات عامة" message="لم تُرجع Supabase مؤشرات النظرة العامة." />
      </Card>
    );
  }

  return (
    <>
      <section className="grid medical-grid">
        {state.data.stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>
      <div className="overview-tables">
        <Table
          title={state.data.ordersTable.title}
          headers={state.data.ordersTable.headers}
          rows={state.data.ordersTable.rows}
          emptyMessage={t("No recent orders are available yet.")}
        />
        <Table
          title={state.data.productsTable.title}
          headers={state.data.productsTable.headers}
          rows={state.data.productsTable.rows}
          emptyMessage={t("No recent products are available yet.")}
        />
      </div>
    </>
  );
}

export function AdminOverviewClient() {
  return <OverviewContent />;
}

function AdminVendorsManager() {
  const [state, setState] = useState<AsyncState<AdminVendorRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [updatingVendorId, setUpdatingVendorId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminVendorsData();
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

  async function updateVendor(vendorId: string, updates: { approval_status?: string; is_active?: boolean }, message: string) {
    setUpdatingVendorId(vendorId);
    setFeedback(null);

    try {
      const result = await adminUpdateVendorAction({
        vendorId,
        approvalStatus: updates.approval_status,
        isActive: updates.is_active,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث المتجر.");
      }

      setFeedback({
        type: "success",
        message,
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingVendorId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل المتاجر من Supabase..." />
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

  const vendors = state.data ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      {vendors.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد متاجر بعد" message="لم تتم إضافة أي شركاء صيدليات بعد." />
        </Card>
      ) : (
        <Table
          title="المتاجر"
          headers={["الاسم", "العنوان", "الموافقة", "الحالة", "الإجراءات"]}
          rows={vendors.map((vendor) => [
            vendor.name,
            vendor.address,
            vendor.approvalStatus,
            vendor.isActive ? "نشط" : "غير نشط",
            <div key={`${vendor.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { approval_status: "approved" },
                    `تم اعتماد ${vendor.name} بنجاح.`
                  )
                }
              >
                اعتماد
              </Button>
              <Button
                className="danger-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { approval_status: "rejected" },
                    `تم رفض ${vendor.name} بنجاح.`
                  )
                }
              >
                رفض
              </Button>
              <Button
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { is_active: !vendor.isActive },
                    `${vendor.isActive ? "تم تعطيل" : "تم تفعيل"} ${vendor.name} بنجاح.`
                  )
                }
              >
                {updatingVendorId === vendor.id ? "جارٍ الحفظ..." : vendor.isActive ? "تعطيل" : "تفعيل"}
              </Button>
            </div>,
          ])}
          emptyMessage="لم تتم إضافة أي متاجر بعد."
        />
      )}
    </div>
  );
}

export function AdminVendorsClient() {
  return <AdminVendorsManager />;
}

function AdminDriversManager() {
  const [state, setState] = useState<AsyncState<AdminDriverRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminDriversData();
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

  async function updateDriver(driverId: string, updates: { approval_status?: string; is_available?: boolean }, message: string) {
    setUpdatingDriverId(driverId);
    setFeedback(null);

    try {
      const result = await adminUpdateDriverAction({
        driverId,
        approvalStatus: updates.approval_status,
        isAvailable: updates.is_available,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث السائق.");
      }

      setFeedback({
        type: "success",
        message,
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingDriverId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل السائقين من Supabase..." />
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

  const drivers = state.data ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      {drivers.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا يوجد سائقون بعد" message="لا توجد حسابات سائقين متاحة بعد." />
        </Card>
      ) : (
        <Table
          title="السائقون"
          headers={["السائق", "الموافقة", "التوفر", "الموقع", "الإجراءات"]}
          rows={drivers.map((driver) => [
            driver.fullName,
            driver.approvalStatus,
            driver.isAvailable ? "نشط" : "غير نشط",
            `${driver.currentLat ?? "-"}, ${driver.currentLng ?? "-"}`,
            <div key={`${driver.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "approved" },
                    `تم اعتماد ${driver.fullName} بنجاح.`
                  )
                }
              >
                اعتماد
              </Button>
              <Button
                className="danger-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "rejected" },
                    `تم رفض ${driver.fullName} بنجاح.`
                  )
                }
              >
                رفض
              </Button>
              <Button
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { is_available: !driver.isAvailable },
                    `${driver.isAvailable ? "تم تعطيل" : "تم تفعيل"} ${driver.fullName} بنجاح.`
                  )
                }
              >
                {updatingDriverId === driver.id ? "جارٍ الحفظ..." : driver.isAvailable ? "تعطيل" : "تفعيل"}
              </Button>
            </div>,
          ])}
          emptyMessage="لا توجد حسابات سائقين متاحة بعد."
        />
      )}
    </div>
  );
}

export function AdminDriversClient() {
  return <AdminDriversManager />;
}

function AdminCustomersManager() {
  const [state, setState] = useState<AsyncState<AdminCustomerRow[]>>({
    data: null,
    error: null,
    loading: true,
  });

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminCustomersData();
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

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل العملاء من Supabase..." />
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

  const customers = state.data ?? [];

  return customers.length === 0 ? (
    <Card className="medical-panel">
      <EmptyState title="لا يوجد عملاء بعد" message="لم يسجل أي عملاء بعد." />
    </Card>
  ) : (
    <Table
      title="العملاء"
      headers={["العميل", "الهاتف", "تاريخ الانضمام", "الحالة"]}
      rows={customers.map((customer) => [
        customer.fullName,
        customer.phone ?? "-",
        customer.createdAt ? formatDate(customer.createdAt) : "-",
        "للقراءة فقط",
      ])}
      emptyMessage="لم يسجل أي عملاء بعد."
    />
  );
}

export function AdminCustomersClient() {
  return <AdminCustomersManager />;
}

function AdminCategoriesManager() {
  const [state, setState] = useState<AsyncState<AdminCategoryRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [categoryName, setCategoryName] = useState("");
  const [categoryArabicName, setCategoryArabicName] = useState("");
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingArabicName, setEditingArabicName] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const data = await loadAdminCategoriesData();
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

  async function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = categoryName.trim();

    if (!name) {
      setFeedback({
        type: "error",
        message: "اسم الفئة مطلوب.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const result = await adminCreateCategoryAction({ name, nameAr: categoryArabicName.trim() || null });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إنشاء الفئة.");
      }

      setCategoryName("");
      setCategoryArabicName("");
      setFeedback({
        type: "success",
        message: "تم إنشاء الفئة بنجاح.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function saveCategory(categoryId: string) {
    const name = editingName.trim();

    if (!name) {
      setFeedback({
        type: "error",
        message: "اسم الفئة مطلوب.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const result = await adminUpdateCategoryAction({
        categoryId,
        name,
        nameAr: editingArabicName.trim() || null,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث الفئة.");
      }

      setEditingCategoryId(null);
      setEditingName("");
      setEditingArabicName("");
      setFeedback({
        type: "success",
        message: "تم تحديث الفئة بنجاح.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(categoryId: string) {
    setDeletingCategoryId(categoryId);
    setFeedback(null);

    try {
      const result = await adminDeleteCategoryAction({
        categoryId,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر حذف الفئة.");
      }

      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setEditingName("");
        setEditingArabicName("");
      }

      setFeedback({
        type: "success",
        message: "تم حذف الفئة بنجاح. ستستمر المنتجات المرتبطة بالعمل مع فئة فارغة.",
      });
      await load();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setDeletingCategoryId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الفئات من Supabase..." />
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

  const categories = state.data ?? [];

  return (
    <div className="stack">
      <Card className="medical-panel">
        <form className="form-grid" onSubmit={createCategory}>
          <div className="field">
            <label htmlFor="admin-category-name">الاسم الداخلي</label>
            <Input
              id="admin-category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Medicine"
            />
          </div>
          <div className="field">
            <label htmlFor="admin-category-name-ar">الاسم العربي</label>
            <Input
              id="admin-category-name-ar"
              value={categoryArabicName}
              onChange={(event) => setCategoryArabicName(event.target.value)}
              placeholder="الأدوية"
            />
          </div>
          <div className="actions">
            <Button type="submit" disabled={saving}>
              {saving ? "جارٍ الحفظ..." : "إضافة فئة"}
            </Button>
          </div>
        </form>
      </Card>

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {categories.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="لا توجد فئات بعد" message="أنشئ أول فئة لتنظيم كتالوج ميدي فاست." />
        </Card>
      ) : (
        <Table
          title="الفئات"
          headers={["الاسم العربي", "الاسم الداخلي", "تاريخ الإنشاء", "الحالة", "الإجراءات"]}
          rows={categories.map((category) => [
            editingCategoryId === category.id ? (
              <Input key={`${category.id}-name-ar-input`} value={editingArabicName} onChange={(event) => setEditingArabicName(event.target.value)} />
            ) : (
              category.displayName || "-"
            ),
            editingCategoryId === category.id ? (
              <Input key={`${category.id}-name-input`} value={editingName} onChange={(event) => setEditingName(event.target.value)} />
            ) : (
              category.name
            ),
            category.createdAt ? formatDate(category.createdAt) : "-",
            "نشط",
            <div key={`${category.id}-actions`} className="table-actions">
              {editingCategoryId === category.id ? (
                <>
                  <Button disabled={saving} onClick={() => void saveCategory(category.id)}>
                    {saving ? "جارٍ الحفظ..." : "حفظ"}
                  </Button>
                  <Button
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => {
                    setEditingCategoryId(null);
                    setEditingName("");
                    setEditingArabicName("");
                  }}
                >
                  إلغاء
                  </Button>
                </>
              ) : (
                <Button
                  className="secondary-button"
                  disabled={deletingCategoryId === category.id}
                  onClick={() => {
                    setEditingCategoryId(category.id);
                    setEditingName(category.name);
                    setEditingArabicName(category.nameAr ?? "");
                  }}
                >
                  تعديل
                </Button>
              )}
              <Button
                className="danger-button"
                disabled={deletingCategoryId === category.id || saving}
                onClick={() => void deleteCategory(category.id)}
              >
                {deletingCategoryId === category.id ? "جارٍ الحذف..." : "حذف"}
              </Button>
            </div>,
          ])}
          emptyMessage="لا توجد فئات متاحة بعد."
        />
      )}
    </div>
  );
}

export function AdminCategoriesClient() {
  return <AdminCategoriesManager />;
}

export function AdminProductsClient() {
  return <AdminProductsManager />;
}

function AdminOrdersManager() {
  const { t } = useLocale();
  const [state, setState] = useState<AsyncState<AdminOrderManagerRow[]>>({
    data: null,
    error: null,
    loading: true,
  });
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function load() {
    setState({
      data: null,
      error: null,
      loading: true,
    });

    try {
      const [data, availableDrivers] = await Promise.all([loadAdminOrdersData(), loadAvailableDrivers()]);
      setState({
        data,
        error: null,
        loading: false,
      });
      setDrivers(availableDrivers);
    } catch (error) {
      setState({
        data: null,
        error: normalizeError(error),
        loading: false,
      });
      setDrivers([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleStatusChange(orderId: string, nextStatus: string) {
    const previousOrders = state.data ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || previousOrder.orderStatus === nextStatus) {
      return;
    }

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data?.map((order) =>
          order.id === orderId
            ? {
                ...order,
                orderStatus: nextStatus,
              }
            : order
        ) ?? null,
      error: current.error,
      loading: current.loading,
    }));

    try {
      const result = await updateAdminOrderStatusAction({
        orderId,
        nextStatus,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر تحديث حالة الطلب.");
      }

      setFeedback({
        type: "success",
        message: `تم تحديث الطلب ${orderId} إلى ${t(nextStatus.replaceAll("_", " "))}.`,
      });
    } catch (error) {
      setState((current) => ({
        data:
          current.data?.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
          ) ?? null,
        error: current.error,
        loading: current.loading,
      }));
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleDriverAssign(orderId: string, selectedDriverId: string) {
    const previousOrders = state.data ?? [];
    const previousOrder = previousOrders.find((order) => order.id === orderId);

    if (!previousOrder || !selectedDriverId) {
      return;
    }

    const selectedDriver = drivers.find((driver) => driver.id === selectedDriverId);

    setUpdatingOrderId(orderId);
    setFeedback(null);
    setState((current) => ({
      data:
        current.data?.map((order) =>
          order.id === orderId
            ? {
                ...order,
                driverId: selectedDriverId,
                driverName: selectedDriver?.fullName ?? order.driverName,
                orderStatus: "assigned",
              }
            : order
        ) ?? null,
      error: current.error,
      loading: current.loading,
    }));

    try {
      const result = await assignDriverAction({
        orderId,
        driverId: selectedDriverId,
      });

      if (!result.success) {
        throw new Error(result.error ?? "تعذر إسناد السائق.");
      }

      setFeedback({
        type: "success",
        message: `تم تعيين سائق للطلب ${orderId}.`,
      });

      await load();
    } catch (error) {
      setState((current) => ({
        data:
          current.data?.map((order) =>
            order.id === orderId
              ? {
                  ...order,
                  driverId: previousOrder.driverId,
                  driverName: previousOrder.driverName,
                  orderStatus: previousOrder.orderStatus,
                }
              : order
          ) ?? null,
        error: current.error,
        loading: current.loading,
      }));
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (state.loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="جارٍ تحميل الطلبات من Supabase..." />
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

  const orders = state.data ?? [];

  return (
    <div className="stack">
      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}
      <Table
        title="الطلبات"
        headers={["معرّف الطلب", "العميل", "المتجر", "الإجمالي", "حالة الدفع", "حالة الطلب", "السائق", "تاريخ الإنشاء"]}
        rows={orders.map((order) => [
          order.id,
          order.customerName,
          order.vendorName,
          formatCurrency(order.total),
          formatPaymentStatusLabel(order.paymentStatus, order.paymentMethod),
          <select
            key={`${order.id}-status`}
            className="input"
            value={order.orderStatus}
            disabled={updatingOrderId === order.id}
            onChange={(event) => void handleStatusChange(order.id, event.target.value)}
          >
            {orderStatusOptions.map((status) => (
              <option key={status} value={status}>
                {t(status.replaceAll("_", " "))}
              </option>
            ))}
          </select>,
          <select
  key={`${order.id}-driver`}
  className="input"
  value={order.driverId ?? ""}
  disabled={updatingOrderId === order.id || (order.orderStatus !== "ready_for_pickup" && !order.driverId)}
  onChange={(event) => void handleDriverAssign(order.id, event.target.value)}
>
  <option value="">{t("Select driver")}</option>
  {drivers.map((driver) => (
    <option key={driver.id} value={driver.id}>
      {driver.fullName}
    </option>
  ))}
</select>,
          order.createdAt ? formatDate(order.createdAt) : "-",
        ])}
        emptyMessage="لا توجد طلبات متاحة بعد."
      />
    </div>
  );
}

export function AdminOrdersClient() {
  return <AdminOrdersManager />;
}

export function AdminMedicalCallout({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  const { t } = useLocale();

  return (
    <Card className="medical-callout">
      <Badge>العمليات الطبية</Badge>
      <h3>{t(title)}</h3>
      <p className="muted">{t(body)}</p>
    </Card>
  );
}
