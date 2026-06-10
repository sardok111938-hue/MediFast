import type { ReactNode } from "react";
import type {
  ProductCategoryOption,
  ProductRow,
} from "../../../../types/dashboard";

export type TableModel = {
  title: string;
  headers: string[];
  rows: ReactNode[][];
};

export type AsyncState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
};

export type OverviewData = {
  stats: {
    label: string;
    value: string;
    hint: string;
  }[];
  ordersTable: TableModel;
  productsTable: TableModel;
};

export type ProductFormValues = {
  name: string;
  barcode: string;
  description: string;
  price: string;
  parent_category_id: string;
  child_category_id: string;
};

export type AdminProductManagerData = {
  categories: ProductCategoryOption[];
  products: ProductRow[];
  vendors: AdminVendorOption[];
};

export type AdminOrderManagerRow = {
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

export type DriverOption = {
  id: string;
  fullName: string;
};

export type AdminOrderControlProps = {
  order: AdminOrderManagerRow;
  disabled: boolean;
};

export type AdminVendorRow = {
  id: string;
  name: string;
  approvalStatus: string;
  address: string;
};

export type AdminVendorOption = {
  id: string;
  name: string;
};

export type AdminDriverRow = {
  id: string;
  fullName: string;
  phone: string | null;
  approvalStatus: string;
  isAvailable: boolean;
  currentLat: number | null;
  currentLng: number | null;
  profileImageUrl: string | null;
  passportImageUrl: string | null;
  passportImagePath: string | null;
  vehicleImageUrl: string | null;
  vehicleImagePath: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  vehicleType: string | null;
  vehiclePlate: string | null;
  currentOrderId: string | null;
  currentOrderStatus: string | null;
};

export type AdminCustomerRow = {
  id: string;
  fullName: string;
  phone: string | null;
  createdAt: string;
};

export type AdminCategoryRow = {
  id: string;
  name: string;
  nameAr: string | null;
  slug: string | null;
  icon: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  parentId: string | null;
  displayName: string;
  childCount: number;
  productCount: number;
  createdAt: string;
};

export type CategoryFormValues = {
  name: string;
  nameAr: string;
  slug: string;
  icon: string;
  imageUrl: string;
  sortOrder: string;
  isActive: boolean;
  parentId: string;
};
