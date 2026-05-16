import { read, utils } from "xlsx";
import {
  PRODUCT_IMPORT_COLUMNS,
  REQUIRED_PRODUCT_IMPORT_COLUMNS,
  type ProductImportParseResult,
  type ProductImportParsedRow,
} from "./types";
import { createEmptyProductImportRow, normalizeProductImportCell } from "./validate-product-import";

const supportedExtensions = [".csv", ".xlsx"];

function normalizeHeader(value: unknown) {
  return normalizeProductImportCell(value).toLowerCase();
}

function assertSupportedProductFile(file: File) {
  const lowerName = file.name.toLowerCase();
  if (!supportedExtensions.some((extension) => lowerName.endsWith(extension))) {
    throw new Error("يرجى اختيار ملف CSV أو XLSX فقط.");
  }
}

function mapProductImportRow(headers: string[], sourceRow: unknown[], rowNumber: number): ProductImportParsedRow {
  const values = createEmptyProductImportRow();

  for (const column of PRODUCT_IMPORT_COLUMNS) {
    const columnIndex = headers.findIndex((header) => header === column);
    values[column] = columnIndex >= 0 ? normalizeProductImportCell(sourceRow[columnIndex]) : "";
  }

  return {
    rowNumber,
    values,
  };
}

function assertRequiredHeaders(headers: string[]) {
  const missingHeaders = REQUIRED_PRODUCT_IMPORT_COLUMNS.filter((column) => !headers.includes(column));

  if (missingHeaders.length > 0) {
    throw new Error(`الأعمدة المطلوبة غير موجودة في الملف: ${missingHeaders.join(", ")}.`);
  }
}

export async function parseProductFile(file: File): Promise<ProductImportParseResult> {
  assertSupportedProductFile(file);

  const workbook = read(await file.arrayBuffer(), {
    type: "array",
    cellDates: false,
    raw: false,
  });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error("الملف لا يحتوي على أي ورقة بيانات.");
  }

  const worksheet = workbook.Sheets[firstSheetName];
  const sheetRows = utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  });

  if (sheetRows.length === 0) {
    throw new Error("الملف فارغ ولا يحتوي على بيانات للاستيراد.");
  }

  const headers = (sheetRows[0] ?? []).map((value) => normalizeHeader(value));
  assertRequiredHeaders(headers);

  const rows = sheetRows.slice(1).map((row, index) => mapProductImportRow(headers, row, index + 2));

  return {
    fileName: file.name,
    headers,
    rows,
  };
}
