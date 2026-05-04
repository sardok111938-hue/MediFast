export const ROUTES = {
  login: "/login",
  admin: "/admin/overview",
  vendor: "/vendor",
  driver: "/driver",
} as const;

export const ADMIN_ROUTES = [
  { href: "/admin/overview", label: "Overview" },
  { href: "/admin/drivers", label: "Drivers" },
  { href: "/admin/vendors", label: "Vendors" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
] as const;

export const VENDOR_ROUTES = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/products/new", label: "Add Product" },
  { href: "/vendor/inventory", label: "Inventory" },
  { href: "/vendor/offers", label: "Offers / Discounts" },
  { href: "/vendor/settings", label: "Store Settings" },
] as const;

export const DRIVER_ROUTES = [
  { href: "/driver", label: "Dashboard" },
  { href: "/driver/orders", label: "Orders" },
] as const;
