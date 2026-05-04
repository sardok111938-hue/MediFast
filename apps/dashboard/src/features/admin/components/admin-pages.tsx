"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
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
  createdAt: string;
};

type CategoryFormValues = {
  name: string;
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

function readCategoryName(value: { name?: string } | { name?: string }[] | null | undefined) {
  return readSingle(value)?.name ?? "-";
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to load dashboard data right now.";
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
          category:categories(name)
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
      { label: "Vendors", value: `${vendorsCount}`, hint: "Pharmacy partners live in marketplace" },
      { label: "Drivers", value: `${driversCount}`, hint: "Courier accounts available to operations" },
      { label: "Customers", value: `${customersCount}`, hint: "Profiles ready for repeat orders" },
      { label: "Products", value: `${productsCount}`, hint: "Catalog items synced from Supabase" },
      { label: "Categories", value: `${categoriesCount}`, hint: "Catalog organization health" },
      { label: "Orders", value: `${ordersCount}`, hint: "Total tracked order records" },
    ],
    ordersTable: {
      title: "Recent Orders",
      headers: ["Order", "Customer", "Vendor", "Status"],
      rows: (ordersResult.data ?? []).map((order) => [
        String(order.id),
        readName((readSingle(order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile), "Customer"),
        readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null),
        <OrderStatusBadge key={`overview-order-${order.id}`} status={String(order.order_status)} />,
      ]),
    },
    productsTable: {
      title: "Recent Products",
      headers: ["Product", "Category", "Price", "Stock"],
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
    title: "Vendors",
    headers: ["Name", "Address", "Approval", "Status"],
    rows: (data ?? []).map((vendor) => [
      String(vendor.name),
      [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join(", ") || "-",
      String(vendor.approval_status),
      vendor.is_active ? "Open" : "Closed",
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
    title: "Drivers",
    headers: ["Driver", "Available", "Approval", "Location"],
    rows: (data ?? []).map((driver) => [
      readName(driver.profile as { full_name?: string } | { full_name?: string }[] | null, "Driver"),
      driver.is_available ? "Yes" : "No",
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
    title: "Customers",
    headers: ["Customer", "Phone", "Joined", "Status"],
    rows: (data ?? []).map((customer) => {
      const profile = readSingle(customer.profile as { full_name?: string; phone?: string | null } | { full_name?: string; phone?: string | null }[] | null);

      return [
        profile?.full_name ?? "Customer",
        profile?.phone ?? "-",
        customer.created_at ? formatDate(String(customer.created_at)) : "-",
        "Active",
      ];
    }),
  };
}

async function loadCategoriesTable(): Promise<TableModel> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return {
    title: "Categories",
    headers: ["Category", "Created", "Catalog State", "Theme"],
    rows: (data ?? []).map((category) => [
      String(category.name),
      category.created_at ? formatDate(String(category.created_at)) : "-",
      "Live",
      "Green-ready",
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
      category:categories(name)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return {
    title: "Products",
    headers: ["Name", "Vendor", "Category", "Price"],
    rows: (data ?? []).map((product) => [
      String(product.name),
      readCategoryName(product.vendor as { name?: string } | { name?: string }[] | null),
      readCategoryName(product.category as { name?: string } | { name?: string }[] | null),
      `${formatCurrency(Number(product.price ?? 0))} • Stock ${Number(product.stock_quantity ?? 0)} • ${product.is_active ? "Active" : "Inactive"}`,
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
    address: [vendor.address_line_1, vendor.area, vendor.city].filter(Boolean).join(", ") || "-",
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
    fullName: readName(driver.profile as { full_name?: string } | { full_name?: string }[] | null, "Driver"),
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
      fullName: profile?.full_name ?? "Customer",
      phone: profile?.phone ?? null,
      createdAt: String(customer.created_at ?? ""),
    };
  });
}

async function loadAdminCategoriesData(): Promise<AdminCategoryRow[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, created_at")
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: String(category.id),
    name: String(category.name),
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
    supabase.from("categories").select("id, name").order("name", { ascending: true }),
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
    return { error: "Please complete all required fields." };
  }

  if (Number.isNaN(price) || price <= 0) {
    return { error: "Price must be greater than 0." };
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
      setMessage(mode === "create" ? "Product created successfully." : "Product updated successfully.");
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
          <label htmlFor={`${mode}-name`}>Name</label>
          <Input
            id={`${mode}-name`}
            name="name"
            value={values.name}
            onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
            placeholder="Paracetamol 500mg"
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${mode}-description`}>Description</label>
          <textarea
            id={`${mode}-description`}
            name="description"
            className="textarea"
            rows={4}
            value={values.description}
            onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))}
            placeholder="Short product description"
            required
          />
        </div>
        <div className="field">
          <label htmlFor={`${mode}-price`}>Price</label>
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
          <label htmlFor={`${mode}-category`}>Category</label>
          <select
            id={`${mode}-category`}
            name="category_id"
            className="input"
            value={values.category_id}
            onChange={(event) => setValues((current) => ({ ...current, category_id: event.target.value }))}
            required
          >
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor={`${mode}-image`}>Image Upload</label>
          <input id={`${mode}-image`} name="image" type="file" accept="image/*" className="input" />
          {product?.image_url ? <p className="muted">Current image saved in Supabase storage.</p> : null}
        </div>
        {message ? <p className={messageType === "error" ? "danger" : "success"}>{message}</p> : null}
        <div className="actions">
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
          </Button>
          {onCancel ? (
            <Button type="button" className="secondary-button" onClick={onCancel} disabled={loading}>
              Cancel
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
        throw new Error(validation.error ?? "Product validation failed.");
      }

      const vendorId = await resolveDefaultVendorId();
      if (!vendorId) {
        throw new Error("Create a vendor first before adding admin products.");
      }

      const image = formData.get("image");
      if (!(image instanceof File) || image.size === 0) {
        throw new Error("Please upload a product image.");
      }

      const imageUrl = await uploadAdminProductImage(image);
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("products").insert({
        vendor_id: vendorId,
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        category_id: validation.payload.category_id,
        image_url: imageUrl,
        stock_quantity: 0,
        is_active: true,
      });

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: "Product created successfully.",
      });
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(formData: FormData) {
    const productId = String(formData.get("product_id") ?? "");
    if (!productId) {
      throw new Error("Product could not be resolved for editing.");
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
        throw new Error(validation.error ?? "Product validation failed.");
      }

      const currentProduct = state.data?.products.find((product) => product.id === productId) ?? null;
      let imageUrl = currentProduct?.image_url ?? null;
      const image = formData.get("image");

      if (image instanceof File && image.size > 0) {
        imageUrl = await uploadAdminProductImage(image);
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("products")
        .update({
          name: validation.payload.name,
          description: validation.payload.description,
          price: validation.payload.price,
          category_id: validation.payload.category_id,
          image_url: imageUrl,
        })
        .eq("id", productId);

      if (error) {
        throw error;
      }

      setEditingProductId(null);
      setFeedback({
        type: "success",
        message: "Product updated successfully.",
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
  .from("products")
  .update({ is_active: false })
  .eq("id", productId);


      if (error) {
        throw error;
      }

      if (editingProductId === productId) {
        setEditingProductId(null);
      }

      setFeedback({
        type: "success",
        message: "Product deactivated successfully.",
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
        <LoadingState message="Loading product manager..." />
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
          <EmptyState title="No products yet" message="Create the first admin-managed product to populate this catalog." />
        </Card>
      ) : (
        <Table
          title="Products"
          headers={["Name", "Category", "Price", "Actions"]}
          rows={products.map((product) => [
            product.name,
            categories.find((category) => category.id === product.category_id)?.name ?? "-",
            `${formatCurrency(product.price)}${product.image_url ? " • Image ready" : " • No image"}`,
            <div key={`${product.id}-actions`} className="table-actions">
              <Button className="secondary-button" onClick={() => setEditingProductId(product.id)} disabled={saving || deletingId === product.id}>
                Edit
              </Button>
              <Button
                className="danger-button"
                onClick={() => void handleDeleteProduct(product.id)}
                disabled={saving || deletingId === product.id}
              >
                {deletingId === product.id ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>,
          ])}
          emptyMessage="No products have been added yet."
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
    title: "Orders",
    headers: ["Order", "Customer", "Payment", "Status"],
    rows: (data ?? []).map((order) => [
      `${String(order.id)} • ${readCategoryName(order.vendor as { name?: string } | { name?: string }[] | null)}`,
      readName((readSingle(order.customer as { profile?: { full_name?: string } | { full_name?: string }[] | null } | null)?.profile), "Customer"),
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
      "Customer"
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
      "Unassigned"
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
      fullName: profile?.full_name ?? "Driver",
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
        <EmptyState title="Nothing to review" message={emptyMessage} />
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
        <LoadingState message="Loading admin overview..." />
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
        <EmptyState title="No overview data" message="Supabase did not return overview metrics." />
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("vendors").update(updates).eq("id", vendorId);

      if (error) {
        throw error;
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
        <LoadingState message="Loading vendors from Supabase..." />
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
          <EmptyState title="No vendors yet" message="No pharmacy partners have been onboarded yet." />
        </Card>
      ) : (
        <Table
          title="Vendors"
          headers={["Name", "Address", "Approval", "Status", "Actions"]}
          rows={vendors.map((vendor) => [
            vendor.name,
            vendor.address,
            vendor.approvalStatus,
            vendor.isActive ? "Active" : "Inactive",
            <div key={`${vendor.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { approval_status: "approved" },
                    `${vendor.name} approved successfully.`
                  )
                }
              >
                Approve
              </Button>
              <Button
                className="danger-button"
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { approval_status: "rejected" },
                    `${vendor.name} rejected successfully.`
                  )
                }
              >
                Reject
              </Button>
              <Button
                disabled={updatingVendorId === vendor.id}
                onClick={() =>
                  void updateVendor(
                    vendor.id,
                    { is_active: !vendor.isActive },
                    `${vendor.name} ${vendor.isActive ? "deactivated" : "activated"} successfully.`
                  )
                }
              >
                {updatingVendorId === vendor.id ? "Saving..." : vendor.isActive ? "Deactivate" : "Activate"}
              </Button>
            </div>,
          ])}
          emptyMessage="No vendors have been onboarded yet."
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("drivers").update(updates).eq("id", driverId);

      if (error) {
        throw error;
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
        <LoadingState message="Loading drivers from Supabase..." />
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
          <EmptyState title="No drivers yet" message="No driver accounts are available yet." />
        </Card>
      ) : (
        <Table
          title="Drivers"
          headers={["Driver", "Approval", "Availability", "Location", "Actions"]}
          rows={drivers.map((driver) => [
            driver.fullName,
            driver.approvalStatus,
            driver.isAvailable ? "Active" : "Inactive",
            `${driver.currentLat ?? "-"}, ${driver.currentLng ?? "-"}`,
            <div key={`${driver.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "approved" },
                    `${driver.fullName} approved successfully.`
                  )
                }
              >
                Approve
              </Button>
              <Button
                className="danger-button"
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { approval_status: "rejected" },
                    `${driver.fullName} rejected successfully.`
                  )
                }
              >
                Reject
              </Button>
              <Button
                disabled={updatingDriverId === driver.id}
                onClick={() =>
                  void updateDriver(
                    driver.id,
                    { is_available: !driver.isAvailable },
                    `${driver.fullName} marked ${driver.isAvailable ? "inactive" : "active"} successfully.`
                  )
                }
              >
                {updatingDriverId === driver.id ? "Saving..." : driver.isAvailable ? "Deactivate" : "Activate"}
              </Button>
            </div>,
          ])}
          emptyMessage="No drivers are available yet."
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
        <LoadingState message="Loading customers from Supabase..." />
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
      <EmptyState title="No customers yet" message="No customers have signed up yet." />
    </Card>
  ) : (
    <Table
      title="Customers"
      headers={["Customer", "Phone", "Joined", "Status"]}
      rows={customers.map((customer) => [
        customer.fullName,
        customer.phone ?? "-",
        customer.createdAt ? formatDate(customer.createdAt) : "-",
        "Read only",
      ])}
      emptyMessage="No customers have signed up yet."
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
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
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
        message: "Category name is required.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("categories").insert({ name });

      if (error) {
        throw error;
      }

      setCategoryName("");
      setFeedback({
        type: "success",
        message: "Category created successfully.",
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
        message: "Category name is required.",
      });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("categories").update({ name }).eq("id", categoryId);

      if (error) {
        throw error;
      }

      setEditingCategoryId(null);
      setEditingName("");
      setFeedback({
        type: "success",
        message: "Category updated successfully.",
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("categories").delete().eq("id", categoryId);

      if (error) {
        throw error;
      }

      if (editingCategoryId === categoryId) {
        setEditingCategoryId(null);
        setEditingName("");
      }

      setFeedback({
        type: "success",
        message: "Category deleted successfully. Referencing products will keep working with a null category.",
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
        <LoadingState message="Loading categories from Supabase..." />
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
            <label htmlFor="admin-category-name">Category Name</label>
            <Input
              id="admin-category-name"
              value={categoryName}
              onChange={(event) => setCategoryName(event.target.value)}
              placeholder="Pain Relief"
            />
          </div>
          <div className="actions">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Create Category"}
            </Button>
          </div>
        </form>
      </Card>

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {categories.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="No categories yet" message="Create the first category to organize the MediFast catalog." />
        </Card>
      ) : (
        <Table
          title="Categories"
          headers={["Category", "Created", "State", "Actions"]}
          rows={categories.map((category) => [
            editingCategoryId === category.id ? (
              <Input
                key={`${category.id}-input`}
                value={editingName}
                onChange={(event) => setEditingName(event.target.value)}
              />
            ) : (
              category.name
            ),
            category.createdAt ? formatDate(category.createdAt) : "-",
            "Live",
            <div key={`${category.id}-actions`} className="table-actions">
              {editingCategoryId === category.id ? (
                <>
                  <Button disabled={saving} onClick={() => void saveCategory(category.id)}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    className="secondary-button"
                    disabled={saving}
                    onClick={() => {
                      setEditingCategoryId(null);
                      setEditingName("");
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  className="secondary-button"
                  disabled={deletingCategoryId === category.id}
                  onClick={() => {
                    setEditingCategoryId(category.id);
                    setEditingName(category.name);
                  }}
                >
                  Edit
                </Button>
              )}
              <Button
                className="danger-button"
                disabled={deletingCategoryId === category.id || saving}
                onClick={() => void deleteCategory(category.id)}
              >
                {deletingCategoryId === category.id ? "Deleting..." : "Delete"}
              </Button>
            </div>,
          ])}
          emptyMessage="No categories are available yet."
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
  const supabase = getSupabaseBrowserClient();

  const { error } = await supabase
    .from("orders")
    .update({ order_status: nextStatus })
    .eq("id", orderId);

  if (error) {
    throw error;
  }

  if (nextStatus === "delivered" && previousOrder.driverId) {
    const { error: driverError } = await supabase
      .from("drivers")
      .update({ is_available: true })
      .eq("id", previousOrder.driverId);

    if (driverError) {
      throw driverError;
    }
  }

  setFeedback({
    type: "success",
    message: `Order ${orderId} updated to ${nextStatus.replaceAll("_", " ")}.`,
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
  const supabase = getSupabaseBrowserClient();

  const { error: orderError } = await supabase
    .from("orders")
    .update({
      driver_id: selectedDriverId,
      order_status: "assigned",
    })
    .eq("id", orderId);

  if (orderError) {
    throw orderError;
  }

  const { error: driverError } = await supabase
    .from("drivers")
    .update({ is_available: false })
    .eq("id", selectedDriverId);

  if (driverError) {
    throw driverError;
  }

  setFeedback({
    type: "success",
    message: `Driver assigned to order ${orderId}.`,
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
        <LoadingState message="Loading orders from Supabase..." />
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
        title="Orders"
        headers={["Order ID", "Customer", "Vendor", "Total", "Payment Status", "Order Status", "Driver", "Created Date"]}
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
        emptyMessage="No orders are available yet."
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
      <Badge>Medical Ops</Badge>
      <h3>{t(title)}</h3>
      <p className="muted">{t(body)}</p>
    </Card>
  );
}
