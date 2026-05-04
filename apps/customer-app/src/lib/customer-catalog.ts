import { addresses, categories, products, vendors } from "@medifast/ui";

function normalizeQuery(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function getCustomerCategories() {
  return categories;
}

export function getCustomerProducts() {
  return products.filter((product) => product.is_active);
}

export function getFeaturedProducts() {
  return getCustomerProducts().slice(0, 4);
}

export function getPopularProducts() {
  return [...getCustomerProducts()].sort((left, right) => Number(Boolean(right.express)) - Number(Boolean(left.express)));
}

export function getCustomerVendors() {
  return vendors;
}

export function getPrimaryAddress() {
  return addresses[0] ?? null;
}

export function getSavedAddresses() {
  return addresses;
}

export function getCategoryById(categoryId?: string | null) {
  if (!categoryId) {
    return null;
  }

  return categories.find((category) => category.id === categoryId) ?? null;
}

export function getVendorById(vendorId?: string | null) {
  if (!vendorId) {
    return null;
  }

  return vendors.find((vendor) => vendor.id === vendorId) ?? null;
}

export function getProductById(productId?: string | null) {
  if (!productId) {
    return null;
  }

  return getCustomerProducts().find((product) => product.id === productId) ?? null;
}

export function filterProducts(input: { categoryId?: string | null; query?: string | null }) {
  const normalizedQuery = normalizeQuery(input.query ?? "");

  return getCustomerProducts().filter((product) => {
    const matchesCategory = !input.categoryId || product.category_id === input.categoryId;

    const matchesQuery =
      !normalizedQuery ||
      normalizeQuery(product.name).includes(normalizedQuery) ||
      normalizeQuery(product.description).includes(normalizedQuery) ||
      normalizeQuery(product.barcode ?? "").includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}
