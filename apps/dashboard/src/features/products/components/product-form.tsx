"use client";

import { useActionState } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import type { ProductCategoryOption, ProductRow } from "../../../types/dashboard";

export interface ProductFormState {
  status: "idle" | "error";
  message: string;
  fieldValues: {
    name: string;
    description: string;
    price: string;
    category_id: string;
    stock_quantity: string;
  };
}

const defaultState: ProductFormState = {
  status: "idle",
  message: "",
  fieldValues: {
    name: "",
    description: "",
    price: "",
    category_id: "",
    stock_quantity: "0",
  },
};

export function ProductForm({
  mode,
  categories,
  vendorId,
  product,
  action,
}: {
  mode: "create" | "edit";
  categories: ProductCategoryOption[];
  vendorId: string;
  product?: ProductRow | null;
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, {
    ...defaultState,
    fieldValues: {
      name: product?.name ?? "",
      description: product?.description ?? "",
      price: product ? String(product.price) : "",
      category_id: product?.category_id ?? "",
      stock_quantity: product ? String(product.stock_quantity) : "0",
    },
  });

  return (
    <Card>
      <form action={formAction} className="form-grid">
        <input type="hidden" name="vendor_id" value={vendorId} />
        <input type="hidden" name="product_id" value={product?.id ?? ""} />
        <div className="field">
          <label htmlFor="name">Name</label>
          <Input id="name" name="name" defaultValue={state.fieldValues.name} placeholder="Paracetamol 500mg" required />
        </div>
        <div className="field">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            name="description"
            defaultValue={state.fieldValues.description}
            className="textarea"
            placeholder="Product description"
            rows={4}
          />
        </div>
        <div className="field">
          <label htmlFor="price">Price</label>
          <Input id="price" name="price" type="number" min="0.01" step="0.01" defaultValue={state.fieldValues.price} required />
        </div>
        <div className="field">
          <label htmlFor="category_id">Category</label>
          <select id="category_id" name="category_id" defaultValue={state.fieldValues.category_id} className="input" required>
            <option value="">Select category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="stock_quantity">Stock Quantity</label>
          <Input id="stock_quantity" name="stock_quantity" type="number" min="0" step="1" defaultValue={state.fieldValues.stock_quantity} required />
        </div>
        <div className="field">
          <label htmlFor="image">Product Image</label>
          <input id="image" name="image" type="file" accept="image/*" className="input" />
          {product?.image_url ? <p className="muted">Current image saved.</p> : null}
        </div>
        {state.status === "error" && state.message ? <p className="danger">{state.message}</p> : null}
        <div className="actions">
          <Button type="submit" disabled={pending}>
            {pending ? "Saving..." : mode === "create" ? "Create Product" : "Update Product"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
