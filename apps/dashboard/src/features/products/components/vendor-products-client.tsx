"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { getSupabaseBrowserClient } from "../../../lib/supabase/browser";
import { Card } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { LoadingState } from "../../../components/ui/loading-state";
import { EmptyState } from "../../../components/ui/empty-state";
import { Table } from "../../../components/ui/table";
import { Input } from "../../../components/ui/input";
import { formatCurrency } from "../../../lib/utils/format-currency";
import type { ProductCategoryOption, ProductRow } from "../../../types/dashboard";

type VendorProductsData = {
  vendorId: string;
  products: ProductRow[];
};

type ProductFormValues = {
  name: string;
  description: string;
  price: string;
  category_id: string;
  stock_quantity: string;
};

const emptyFormValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  category_id: "",
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
    image_url: product.image_url ? String(product.image_url) : null,
  };
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete the product request right now.";
}

function buildFormValues(product?: ProductRow | null): ProductFormValues {
  if (!product) {
    return emptyFormValues;
  }

  return {
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    category_id: product.category_id ?? "",
    stock_quantity: String(product.stock_quantity),
  };
}

function validateProductForm(values: ProductFormValues) {
  const name = values.name.trim();
  const description = values.description.trim();
  const price = Number(values.price);
  const stockQuantity = values.stock_quantity.trim() ? Number(values.stock_quantity) : 0;
  const categoryId = values.category_id.trim();

  if (!name || !description || !values.price || !categoryId) {
    return { error: "Please complete all required fields." };
  }

  if (Number.isNaN(price) || price <= 0) {
    return { error: "Price must be greater than 0." };
  }

  if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
    return { error: "Stock quantity must be 0 or greater." };
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

async function uploadProductImage(file: File) {
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

async function loadVendorCategories(): Promise<ProductCategoryOption[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("categories").select("id, name").order("name", { ascending: true });

  console.log("VendorProductsClient categories fetch", {
    data,
    error,
    count: data?.length ?? 0,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((category) => ({
    id: String(category.id),
    name: String(category.name),
  }));
}

async function loadVendorProductsData(): Promise<VendorProductsData> {
  const supabase = getSupabaseBrowserClient();
  const { data: vendorId, error: vendorError } = await supabase.rpc("get_vendor_id");

  if (vendorError) {
    throw vendorError;
  }

  if (!vendorId) {
    throw new Error("Vendor account is not linked correctly.");
  }

  const { data: productsData, error: productsError } = await supabase
    .from("products")
    .select("id, vendor_id, category_id, name, description, price, stock_quantity, barcode, is_active, image_url")
    .eq("vendor_id", vendorId)
    .eq("is_active", true)
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
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
}) {
  const [values, setValues] = useState<ProductFormValues>(buildFormValues(product));
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    setValues(buildFormValues(product));
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
      stock_quantity: String(formData.get("stock_quantity") ?? "0"),
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
        setValues(emptyFormValues);
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
        <p className="muted">Categories loaded: {categories.length}</p>
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
            placeholder="Product description"
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
  style={{
    display: "block",
    width: "100%",
    minHeight: 44,
    padding: 10,
    border: "1px solid #ccc",
    borderRadius: 8,
    background: "white",
    color: "black",
  }}
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
          {categories.length === 0 ? <p className="danger">No categories are currently available.</p> : null}
        </div>
        <div className="field">
          <label htmlFor={`${mode}-stock`}>Stock Quantity</label>
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
          <label htmlFor={`${mode}-image`}>Image Upload</label>
          <input id={`${mode}-image`} name="image" type="file" accept="image/*" className="input" />
          {product?.image_url ? <p className="muted">Current image saved in Supabase storage.</p> : <p className="muted">Image upload is optional.</p>}
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

export function VendorProductsClient() {
  const [data, setData] = useState<VendorProductsData | null>(null);
  const [categories, setCategories] = useState<ProductCategoryOption[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    setCategoriesError(null);

    try {
      const nextData = await loadVendorProductsData();
      setData(nextData);
    } catch (error) {
      setError(normalizeError(error));
      setData(null);
    } finally {
      setLoading(false);
    }

    try {
      const nextCategories = await loadVendorCategories();
      setCategories(nextCategories);
    } catch (error) {
      setCategories([]);
      setCategoriesError(normalizeError(error));
    }
  }

  async function loadCategoriesOnly() {
    setCategoriesError(null);

    try {
      const nextCategories = await loadVendorCategories();
      setCategories(nextCategories);
    } catch (error) {
      setCategories([]);
      setCategoriesError(normalizeError(error));
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function handleCreateProduct(formData: FormData) {
    if (!data) {
      throw new Error("Vendor account is not ready yet.");
    }

    setSaving(true);
    setFeedback(null);

    try {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        category_id: String(formData.get("category_id") ?? ""),
        stock_quantity: String(formData.get("stock_quantity") ?? "0"),
      };
      const validation = validateProductForm(values);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "Product validation failed.");
      }

      let imageUrl: string | null = null;
      const image = formData.get("image");

      if (image instanceof File && image.size > 0) {
        imageUrl = await uploadProductImage(image);
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("products").insert({
        vendor_id: data.vendorId,
        name: validation.payload.name,
        description: validation.payload.description,
        price: validation.payload.price,
        category_id: validation.payload.category_id,
        stock_quantity: validation.payload.stock_quantity,
        image_url: imageUrl,
        is_active: true,
      });

      if (error) {
        throw error;
      }

      setFeedback({
        type: "success",
        message: "Product created successfully.",
      });
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function handleEditProduct(formData: FormData) {
    if (!data) {
      throw new Error("Vendor account is not ready yet.");
    }

    const productId = String(formData.get("product_id") ?? "");
    if (!productId) {
      throw new Error("Product could not be resolved.");
    }

    setSaving(true);
    setFeedback(null);

    try {
      const values = {
        name: String(formData.get("name") ?? ""),
        description: String(formData.get("description") ?? ""),
        price: String(formData.get("price") ?? ""),
        category_id: String(formData.get("category_id") ?? ""),
        stock_quantity: String(formData.get("stock_quantity") ?? "0"),
      };
      const validation = validateProductForm(values);

      if (validation.error || !validation.payload) {
        throw new Error(validation.error ?? "Product validation failed.");
      }

      const currentProduct = data.products.find((product) => product.id === productId);
      if (!currentProduct) {
        throw new Error("You can only edit your own products.");
      }

      let imageUrl = currentProduct.image_url;
      const image = formData.get("image");

      if (image instanceof File && image.size > 0) {
        imageUrl = await uploadProductImage(image);
      }

      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("products")
        .update({
          name: validation.payload.name,
          description: validation.payload.description,
          price: validation.payload.price,
          category_id: validation.payload.category_id,
          stock_quantity: validation.payload.stock_quantity,
          image_url: imageUrl,
        })
        .eq("id", productId)
        .eq("vendor_id", data.vendorId);

      if (error) {
        throw error;
      }

      setEditingProductId(null);
      setFeedback({
        type: "success",
        message: "Product updated successfully.",
      });
      await loadProducts();
    } finally {
      setSaving(false);
    }
  }

  async function deactivateProduct(productId: string) {
    if (!data) {
      return;
    }

    setDeactivatingId(productId);
    setFeedback(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("products")
        .update({ is_active: false })
        .eq("id", productId)
        .eq("vendor_id", data.vendorId);

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
      await loadProducts();
    } catch (error) {
      setFeedback({
        type: "error",
        message: normalizeError(error),
      });
    } finally {
      setDeactivatingId(null);
    }
  }

  if (loading) {
    return (
      <Card className="medical-panel">
        <LoadingState message="Loading vendor products..." />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="medical-panel">
        <p className="danger">{error}</p>
        <Button onClick={() => void loadProducts()}>Retry</Button>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="medical-panel">
        <EmptyState title="Vendor not ready" message="Your vendor account could not be resolved." />
      </Card>
    );
  }

  const editingProduct = data.products.find((product) => product.id === editingProductId) ?? null;

  return (
    <div className="stack">
      <Card className="medical-panel">
        <p className="muted">Categories loaded: {categories.length}</p>
      </Card>

      {categoriesError ? (
        <Card className="medical-panel">
          <p className="danger">{categoriesError}</p>
          <Button onClick={() => void loadCategoriesOnly()}>Retry Categories</Button>
        </Card>
      ) : null}

      <VendorProductForm mode="create" categories={categories} loading={saving && !editingProductId} onSubmit={handleCreateProduct} />

      {feedback ? <p className={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</p> : null}

      {editingProduct ? (
        <VendorProductForm
          mode="edit"
          categories={categories}
          product={editingProduct}
          loading={saving && editingProductId === editingProduct.id}
          onSubmit={handleEditProduct}
          onCancel={() => setEditingProductId(null)}
        />
      ) : null}

      {data.products.length === 0 ? (
        <Card className="medical-panel">
          <EmptyState title="No products yet" message="Your vendor catalog is empty." />
        </Card>
      ) : (
        <Table
          title="Products"
          headers={["Name", "Category", "Price", "Actions"]}
          rows={data.products.map((product) => [
            product.name,
            categories.find((category) => category.id === product.category_id)?.name ?? "-",
            `${formatCurrency(product.price)} • Stock ${product.stock_quantity}`,
            <div key={`${product.id}-actions`} className="table-actions">
              <Button
                className="secondary-button"
                onClick={() => setEditingProductId(product.id)}
                disabled={saving || deactivatingId === product.id}
              >
                Edit
              </Button>
              <Button
                className="danger-button"
                disabled={deactivatingId === product.id || saving}
                onClick={() => void deactivateProduct(product.id)}
              >
                {deactivatingId === product.id ? "Deactivating..." : "Deactivate"}
              </Button>
            </div>,
          ])}
          emptyMessage="No products found."
        />
      )}
    </div>
  );
}
