export const PRODUCT_IMPORT_COLUMNS = [
  "name",
  "description",
  "category_slug",
  "price",
  "stock_quantity",
  "stock",
  "quantity",
  "qty",
  "barcode",
  "image_url",
] as const;

export const REQUIRED_PRODUCT_IMPORT_COLUMNS = ["barcode", "price"] as const;

export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];
export type ProductImportRequiredColumn =
  (typeof REQUIRED_PRODUCT_IMPORT_COLUMNS)[number];
export type ProductImportErrorField = ProductImportColumn | "row";

export type ProductImportRawRow = Record<ProductImportColumn, string>;

export type ProductImportParsedRow = {
  rowNumber: number;
  values: ProductImportRawRow;
};

export type ProductImportValidationError = {
  rowNumber: number;
  field: ProductImportErrorField;
  message: string;
};

export type ProductImportValidatedRow = {
  rowNumber: number;
  name: string;
  description: string | null;
  categorySlug: string | null;
  categoryId: string | null;
  price: number;
  stockQuantity: number;
  barcode: string;
  imageUrl: string | null;
};

export type ProductImportValidationResult = {
  totalRows: number;
  validRows: ProductImportValidatedRow[];
  errors: ProductImportValidationError[];
};

export type ProductImportParseResult = {
  fileName: string;
  headers: string[];
  rows: ProductImportParsedRow[];
};

export type VendorBulkCreateProductsInput = {
  rows: ProductImportParsedRow[];
};

export type VendorBulkCreateProductsResult = {
  success: boolean;
  error: string | null;
  totalRows: number;
  insertedCount: number;
  updatedCount: number;
  failedCount: number;
  errors: ProductImportValidationError[];
};
