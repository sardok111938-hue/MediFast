import { ADMIN_ROUTES, DRIVER_ROUTES, VENDOR_ROUTES } from "./routes";

export const dashboardNavigation = {
  admin: ADMIN_ROUTES,
  vendor: VENDOR_ROUTES,
  driver: DRIVER_ROUTES,
} as const;
