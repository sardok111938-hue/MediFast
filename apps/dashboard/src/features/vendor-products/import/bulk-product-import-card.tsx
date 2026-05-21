"use client";

import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import type { ProductCategoryOption } from "../../../types/dashboard";
import { vendorBulkCreateProductsAction } from "../../products/actions";
import { parseProductFile } from "./parse-product-file";
import type {
  ProductImportParseResult,
  ProductImportValidationResult,
  VendorBulkCreateProductsResult,
} from "./types";
import { validateProductImportRows } from "./validate-product-import";

type BulkProductImportCardProps = {
  categories: ProductCategoryOption[];
  onImportComplete: () => Promise<void>;
};

function formatImportField(field: string) {
  switch (field) {
    case "name":
      return "الاسم";
    case "category_slug":
      return "رمز الفئة";
    case "price":
      return "السعر";
    case "stock_quantity":
      return "الكمية";
    case "barcode":
      return "الباركود";
    case "image_url":
      return "رابط الصورة";
    case "description":
      return "الوصف";
    default:
      return "الصف";
  }
}

export function BulkProductImportCard({ categories, onImportComplete }: BulkProductImportCardProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ProductImportParseResult | null>(null);
  const [clientValidation, setClientValidation] = useState<ProductImportValidationResult | null>(null);
  const [importResult, setImportResult] = useState<VendorBulkCreateProductsResult | null>(null);
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const categoryIdBySlug = useMemo(() => {
    const entries = categories
      .filter((category) => category.is_active && category.slug)
      .map((category) => [String(category.slug).trim().toLowerCase(), String(category.id)] as const);

    return new Map<string, string>(entries);
  }, [categories]);

  const previewRows = parseResult?.rows.slice(0, 5) ?? [];
  const clientErrors = clientValidation?.errors.slice(0, 10) ?? [];
  const hasReadyRows = (clientValidation?.validRows.length ?? 0) > 0;
  const hasBlockingErrors = (clientValidation?.errors.length ?? 0) > 0;

  function downloadTemplate() {
  const csv = [
    "name,description,category_slug,price,stock_quantity,barcode,image_url",
    "باراسيتامول 500 مجم,مسكن وخافض حرارة,pain-relief,4.50,20,6290000000000,https://example.com/product.jpg",
  ].join("\n");

  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "medifast-products-template.csv";
  link.click();

  URL.revokeObjectURL(url);
}

  async function handleSelectedFile(file: File) {
    setIsParsing(true);
    setParsingError(null);
    setImportResult(null);

    try {
      const nextParseResult = await parseProductFile(file);
      const nextValidation = validateProductImportRows(nextParseResult.rows, {
        categoryIdBySlug,
      });

      setSelectedFileName(file.name);
      setParseResult(nextParseResult);
      setClientValidation(nextValidation);
    } catch (error) {
      setSelectedFileName(file.name);
      setParseResult(null);
      setClientValidation(null);
      setParsingError(error instanceof Error ? error.message : "تعذر قراءة الملف الآن.");
    } finally {
      setIsParsing(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleSelectedFile(file);
  }

  async function handleImport() {
    if (!parseResult || !clientValidation || !hasReadyRows) {
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await vendorBulkCreateProductsAction({
        rows: parseResult.rows,
      });

      setImportResult(result);

      if (result.success && (result.insertedCount > 0 || result.updatedCount > 0)) {
        await onImportComplete();
      }
    } catch (error) {
      setImportResult({
  success: false,
  error: error instanceof Error ? error.message : "تعذر تنفيذ الاستيراد الآن.",
  totalRows: clientValidation.totalRows,
  insertedCount: 0,
  updatedCount: 0,
  failedCount: clientValidation.totalRows,
  errors: [],
});
    } finally {
      setIsImporting(false);
    }
  }

  function resetImportState() {
    setSelectedFileName(null);
    setParseResult(null);
    setClientValidation(null);
    setImportResult(null);
    setParsingError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <Card className="medical-panel">
      <div className="split-actions">
        <div>
          <h3 className="order-card-title">رفع ملف المنتجات</h3>
          <p className="muted order-card-subtitle">
            ارفع ملف CSV أو XLSX بالأعمدة التالية: name, description, category_slug, price, stock_quantity, barcode, image_url.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        className="sr-only"
        onChange={(event) => void handleFileChange(event)}
      />

      <button
        type="button"
        className={`import-dropzone ${isDragging ? "import-dropzone-active" : ""}`.trim()}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);

          const file = event.dataTransfer.files?.[0];
          if (file) {
            void handleSelectedFile(file);
          }
        }}
      >
        <strong>اسحب الملف هنا أو اضغط للاختيار</strong>
        <span className="muted">ندعم ملفات CSV و XLSX مع اتجاه RTL ومعاينة قبل الاستيراد.</span>
        {selectedFileName ? <span className="import-file-pill">{selectedFileName}</span> : null}
      </button>

      <div className="inline-actions" style={{ justifyContent: "space-between" }}>
        <div className="muted">
          {isParsing
            ? "جارٍ تحليل الملف..."
            : clientValidation
              ? `${clientValidation.totalRows} صفوف جاهزة للمراجعة قبل الاستيراد.`
              : "سيتم تجاهل الصفوف الفارغة بالكامل والتحقق من كل صف على حدة."}
        </div>
        <div className="inline-actions">
  <Button type="button" className="secondary-button" onClick={downloadTemplate} disabled={isParsing || isImporting}>
    تحميل قالب CSV
  </Button>

  <Button type="button" className="secondary-button" onClick={resetImportState} disabled={isParsing || isImporting}>
    مسح
  </Button>
          <Button
  type="button"
  onClick={() => void handleImport()}
  disabled={!hasReadyRows || hasBlockingErrors || isParsing || isImporting}
>
            {isImporting ? "جارٍ الاستيراد..." : "استيراد المنتجات"}
          </Button>
        </div>
      </div>

      {categories.length === 0 ? <p className="danger">لا توجد فئات نشطة متاحة حاليًا للتحقق من `category_slug`.</p> : null}

      {parsingError ? <p className="danger">{parsingError}</p> : null}

      {parseResult ? (
        <div className="stack compact-stack">
                    <div className="import-summary-grid">
            <div className="import-summary-tile">
              <strong>إجمالي الصفوف</strong>
              <span>{clientValidation?.totalRows ?? 0}</span>
            </div>
            <div className="import-summary-tile">
              <strong>صالحة مبدئيًا</strong>
              <span>{clientValidation?.validRows.length ?? 0}</span>
            </div>
            <div className="import-summary-tile">
              <strong>بحاجة لمراجعة</strong>
              <span>{clientValidation?.errors.length ?? 0}</span>
            </div>
          </div>

          <div className="stack compact-stack">
            <div>
              <h4 className="order-card-title" style={{ fontSize: "var(--font-size-heading-md)" }}>
                معاينة أول 5 صفوف
              </h4>
              <p className="muted order-card-subtitle">هذه المعاينة تعرض القيم بعد قراءة الملف مباشرة وقبل الإرسال إلى الخادم.</p>
            </div>
            <div className="import-preview-table">
              <div className="import-preview-row import-preview-head">
                <strong>الصف</strong>
                <strong>الاسم</strong>
                <strong>رمز الفئة</strong>
                <strong>السعر</strong>
                <strong>الكمية</strong>
                <strong>الباركود</strong>
              </div>
              {previewRows.map((row) => (
                <div key={`preview-row-${row.rowNumber}`} className="import-preview-row">
                  <span>{row.rowNumber}</span>
                  <span>{row.values.name || "-"}</span>
                  <span>{row.values.category_slug || "-"}</span>
                  <span>{row.values.price || "-"}</span>
                  <span>{row.values.stock_quantity || "-"}</span>
                  <span>{row.values.barcode || "-"}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {clientErrors.length > 0 ? (
        <div className="stack compact-stack">
          <h4 className="order-card-title" style={{ fontSize: "var(--font-size-heading-md)" }}>
            أخطاء تحتاج تعديلًا قبل الاستيراد
          </h4>
          <div className="import-error-list">
            {clientErrors.map((error) => (
              <p key={`client-error-${error.rowNumber}-${error.field}-${error.message}`} className="danger" style={{ margin: 0 }}>
                الصف {error.rowNumber}، {formatImportField(error.field)}: {error.message}
              </p>
            ))}
          </div>
        </div>
      ) : null}

      {importResult ? (
        <div className="stack compact-stack">
          <p className={importResult.success ? "success" : "danger"} style={{ margin: 0 }}>
            {importResult.success
              ? importResult.insertedCount > 0 || importResult.updatedCount > 0
                ? "اكتمل استيراد المنتجات وتحديث الكتالوج."
                : "اكتمل الفحص لكن لم يتم إجراء أي تغييرات."
              : importResult.error ?? "تعذر تنفيذ الاستيراد الآن."}
          </p>

          <div className="import-summary-grid">
            <div className="import-summary-tile">
              <strong>إجمالي الصفوف</strong>
              <span>{importResult.totalRows}</span>
            </div>
            <div className="import-summary-tile">
              <strong>تمت إضافتها</strong>
              <span>{importResult.insertedCount}</span>
            </div>
            <div className="import-summary-tile">
              <strong>تم تحديثها</strong>
              <span>{importResult.updatedCount}</span>
            </div>
            <div className="import-summary-tile">
              <strong>فشلت</strong>
              <span>{importResult.failedCount}</span>
            </div>
          </div>

          {importResult.errors.length > 0 ? (
            <div className="import-error-list">
              {importResult.errors.slice(0, 15).map((error) => (
                <p key={`server-error-${error.rowNumber}-${error.field}-${error.message}`} className="danger" style={{ margin: 0 }}>
                  الصف {error.rowNumber}، {formatImportField(error.field)}: {error.message}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}