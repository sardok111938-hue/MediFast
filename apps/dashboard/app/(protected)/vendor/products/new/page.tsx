import { redirect } from "next/navigation";
import { DashboardShell } from "../../../../../src/components/app-shell/dashboard-shell";
import { PageHeader } from "../../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../../src/lib/config/navigation";
import { ProductForm } from "../../../../../src/features/products/components/product-form";
import type { ProductFormState } from "../../../../../src/features/products/components/product-form";
import { createProduct, updateProduct } from "../../../../../src/features/products/api";
import { listProductCategories, getProductById } from "../../../../../src/features/products/queries";
import { uploadProductImage } from "../../../../../src/features/products/storage";
import { listVendors } from "../../../../../src/features/vendors/queries";

function buildErrorState(
  fieldValues: ProductFormState["fieldValues"],
  message: string
): ProductFormState {
  return {
    status: "error",
    message,
    fieldValues,
  };
}

export default async function VendorAddProductPage({
  searchParams,
}: {
  searchParams?: Promise<{ productId?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const productId = resolvedSearchParams?.productId;
  const product = productId ? await getProductById(productId) : null;
  const categories = await listProductCategories();
  const vendors = await listVendors();
  const fallbackVendorId = product?.vendor_id ?? vendors[0]?.id ?? "";

  async function handleSaveProduct(state: ProductFormState, formData: FormData): Promise<ProductFormState> {
    "use server";

    const fieldValues = {
      name: String(formData.get("name") ?? ""),
      description: String(formData.get("description") ?? ""),
      price: String(formData.get("price") ?? ""),
      category_id: String(formData.get("category_id") ?? ""),
      stock_quantity: String(formData.get("stock_quantity") ?? ""),
    };

    const vendorId = String(formData.get("vendor_id") ?? fallbackVendorId);
    const submittedProductId = String(formData.get("product_id") ?? "");
    const name = fieldValues.name.trim();
    const description = fieldValues.description.trim();
    const price = Number(fieldValues.price);
    const stockQuantity = Number(fieldValues.stock_quantity);
    const categoryId = fieldValues.category_id || null;
    const image = formData.get("image");

    if (!vendorId) {
      return buildErrorState(fieldValues, "Vendor could not be resolved for this product.");
    }

    if (!name || !categoryId || !fieldValues.price || !fieldValues.stock_quantity) {
      return buildErrorState(fieldValues, "Please complete all required fields.");
    }

    if (Number.isNaN(price) || price <= 0) {
      return buildErrorState(fieldValues, "Price must be greater than 0.");
    }

    if (Number.isNaN(stockQuantity) || stockQuantity < 0) {
      return buildErrorState(fieldValues, "Stock quantity must be 0 or greater.");
    }

    let imageUrl = product?.image_url ?? null;

    if (image instanceof File && image.size > 0) {
      const uploadResult = await uploadProductImage(image);
      if (uploadResult.error || !uploadResult.data) {
        return buildErrorState(fieldValues, uploadResult.error?.message ?? "Image upload failed.");
      }

      imageUrl = uploadResult.data.publicUrl;
    } else if (!submittedProductId) {
      return buildErrorState(fieldValues, "Please upload a product image.");
    }

    if (submittedProductId) {
      const result = await updateProduct(submittedProductId, {
        name,
        description,
        price,
        category_id: categoryId,
        stock_quantity: stockQuantity,
        image_url: imageUrl,
      });

      if (result.error) {
        return buildErrorState(fieldValues, result.error.message);
      }

      redirect("/vendor/products?success=updated");
    }

    const result = await createProduct({
      vendor_id: vendorId,
      name,
      description,
      price,
      category_id: categoryId,
      stock_quantity: stockQuantity,
      image_url: imageUrl,
    });

    if (result.error) {
      return buildErrorState(fieldValues, result.error.message);
    }

    redirect("/vendor/products?success=created");
  }

  return (
    <DashboardShell title="Add / Edit Product" subtitle="Hook image upload to Supabase Storage bucket `product-images`." nav={dashboardNavigation.vendor}>
      <PageHeader
        title={product ? "Edit Product" : "Add Product"}
        description="Create or update vendor products with image upload to Supabase Storage."
      />
      <ProductForm
        mode={product ? "edit" : "create"}
        categories={categories}
        vendorId={fallbackVendorId}
        product={product}
        action={handleSaveProduct}
      />
    </DashboardShell>
  );
}
