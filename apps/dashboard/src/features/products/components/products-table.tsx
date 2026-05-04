import Link from "next/link";
import type { ReactNode } from "react";
import { Table } from "../../../components/ui/table";
import type { ProductRow } from "../../../types/dashboard";

export function ProductsTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: ReactNode[][];
}) {
  return <Table title={title} headers={headers} rows={rows} />;
}

export function VendorProductsManagementTable({
  products,
  deleteAction,
}: {
  products: ProductRow[];
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <Table
      title="Products"
      headers={["Name", "Price", "Stock", "Status", "Actions"]}
      rows={products.map((product) => [
        product.name,
        `$${product.price.toFixed(2)}`,
        `${product.stock_quantity}`,
        product.is_active ? "active" : "inactive",
        <div key={`${product.id}-actions`} className="table-actions">
          <Link href={`/vendor/products/new?productId=${product.id}`} className="button secondary-button">
            Edit
          </Link>
          <form action={deleteAction}>
            <input type="hidden" name="product_id" value={product.id} />
            <button type="submit" className="button danger-button">
              Delete
            </button>
          </form>
        </div>,
      ])}
    />
  );
}
