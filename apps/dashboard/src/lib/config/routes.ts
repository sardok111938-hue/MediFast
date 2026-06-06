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
  { href: "/admin/vendor-settlements", label: "PharmacySettlements" },
  { href: "/admin/driver-settlements", label: "DriverSettlements" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/delivery-fees", label: "Delivery Fees" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/settings", label: "Settings" },
] as const;

export const VENDOR_ROUTES = [
  { href: "/vendor", label: "Dashboard" },
  { href: "/vendor/orders", label: "Orders" },
  { href: "/vendor/prescriptions", label: "الوصفات الطبية" },
  { href: "/vendor/products", label: "Products" },
  { href: "/vendor/inventory", label: "Inventory" },
] as const;

export const DRIVER_ROUTES = [
  { href: "/driver", label: "Dashboard" },
  { href: "/driver/orders", label: "Orders" },
] as const;