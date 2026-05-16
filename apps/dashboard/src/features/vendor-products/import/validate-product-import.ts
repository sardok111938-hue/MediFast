import type {
  ProductImportColumn,
  ProductImportParsedRow,
  ProductImportRawRow,
  ProductImportValidationError,
  ProductImportValidationResult,
  ProductImportValidatedRow,
} from "./types";

type ValidateProductImportOptions = {
  categoryIdBySlug?: ReadonlyMap<string, string>;
  existingBarcodes?: ReadonlySet<string>;
};

const EMPTY_RAW_ROW: ProductImportRawRow = {
  name: "",
  description: "",
  category_slug: "",
  price: "",
  stock_quantity: "",
  barcode: "",
  image_url: "",
};

export function createEmptyProductImportRow(): ProductImportRawRow {
  return { ...EMPTY_RAW_ROW };
}

export function normalizeProductImportCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\uFEFF/g, "").trim();
}

export function normalizeProductImportSlug(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeProductImportBarcode(value: string) {
  return value.trim();
}

export function isProductImportRowEmpty(row: ProductImportRawRow) {
  return Object.values(row).every((value) => normalizeProductImportCell(value) === "");
}

function pushRowError(
  errors: ProductImportValidationError[],
  rowNumber: number,
  field: ProductImportColumn,
  message: string
) {
  errors.push({ rowNumber, field, message });
}

export function validateProductImportRows(
  rows: ProductImportParsedRow[],
  options: ValidateProductImportOptions = {}
): ProductImportValidationResult {
  const categoryIdBySlug = options.categoryIdBySlug ?? new Map<string, string>();
  const existingBarcodes = options.existingBarcodes ?? new Set<string>();
  const errors: ProductImportValidationError[] = [];
  const validRows: ProductImportValidatedRow[] = [];
  const seenBarcodes = new Map<string, number>();

  for (const row of rows) {
    const normalizedRow: ProductImportRawRow = {
      name: normalizeProductImportCell(row.values.name),
      description: normalizeProductImportCell(row.values.description),
      category_slug: normalizeProductImportSlug(normalizeProductImportCell(row.values.category_slug)),
      price: normalizeProductImportCell(row.values.price),
      stock_quantity: normalizeProductImportCell(row.values.stock_quantity),
      barcode: normalizeProductImportBarcode(normalizeProductImportCell(row.values.barcode)),
      image_url: normalizeProductImportCell(row.values.image_url),
    };

    if (isProductImportRowEmpty(normalizedRow)) {
      continue;
    }

    const rowErrorsBefore = errors.length;
    const name = normalizedRow.name;
    const categorySlug = normalizedRow.category_slug;
    const description = normalizedRow.description || null;
    const barcode = normalizedRow.barcode || null;
    const imageUrl = normalizedRow.image_url || null;
    const price = Number(normalizedRow.price);
    const stockQuantity = Number(normalizedRow.stock_quantity);

    if (!name) {
      pushRowError(errors, row.rowNumber, "name", "اسم المنتج مطلوب.");
    }

    if (!normalizedRow.price) {
      pushRowError(errors, row.rowNumber, "price", "السعر مطلوب.");
    } else if (Number.isNaN(price) || !Number.isFinite(price) || price < 0) {
      pushRowError(errors, row.rowNumber, "price", "السعر يجب أن يكون رقمًا صالحًا يساوي 0 أو أكثر.");
    }

    if (!normalizedRow.stock_quantity) {
      pushRowError(errors, row.rowNumber, "stock_quantity", "الكمية مطلوبة.");
    } else if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
      pushRowError(errors, row.rowNumber, "stock_quantity", "الكمية يجب أن تكون عددًا صحيحًا يساوي 0 أو أكثر.");
    }

    if (!categorySlug) {
      pushRowError(errors, row.rowNumber, "category_slug", "رمز الفئة `category_slug` مطلوب.");
    } else if (!categoryIdBySlug.has(categorySlug)) {
      pushRowError(errors, row.rowNumber, "category_slug", "تعذر العثور على فئة نشطة تطابق هذا الرمز.");
    }

    if (barcode) {
  if (seenBarcodes.has(barcode)) {
    pushRowError(
      errors,
      row.rowNumber,
      "barcode",
      `هذا الباركود مكرر داخل الملف نفسه، وقد ظهر أولًا في الصف ${seenBarcodes.get(barcode)}.`
    );
  } else {
    seenBarcodes.set(barcode, row.rowNumber);
  }
}

    if (errors.length > rowErrorsBefore) {
      continue;
    }

    validRows.push({
      rowNumber: row.rowNumber,
      name,
      description,
      categorySlug,
      categoryId: categoryIdBySlug.get(categorySlug) ?? null,
      price,
      stockQuantity,
      barcode,
      imageUrl,
    });
  }

  return {
    totalRows: rows.filter((row) => !isProductImportRowEmpty(row.values)).length,
    validRows,
    errors,
  };
}
