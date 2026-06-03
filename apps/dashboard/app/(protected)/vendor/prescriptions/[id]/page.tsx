import Link from "next/link";
import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";

import { DashboardShell } from "../../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../../src/components/ui/card";
import { PageHeader } from "../../../../../src/components/ui/page-header";
import {
  createVendorPrescriptionQuote,
  deleteVendorPrescriptionQuoteItem,
  getVendorPrescriptionQuoteForRequest,
  getVendorPrescriptionRequest,
  listVendorQuoteProductOptions,
  sendVendorPrescriptionQuote,
  upsertVendorPrescriptionQuoteItem,
} from "../../../../../src/features/orders/api";
import { dashboardNavigation } from "../../../../../src/lib/config/navigation";
import type { PrescriptionQuoteItemAvailability } from "@medifast/types";

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "accepted":
      return "مقبولة";
    case "rejected":
      return "مرفوضة";
    case "cancelled":
      return "ملغاة";
    default:
      return status;
  }
}

function getQuoteStatusLabel(status: string) {
  switch (status) {
    case "draft":
      return "مسودة";
    case "sent":
      return "مرسل للعميل";
    case "accepted":
      return "قبله العميل";
    case "rejected":
      return "رفضه العميل";
    case "expired":
      return "منتهي";
    default:
      return status;
  }
}

function getAvailabilityLabel(status: string) {
  switch (status) {
    case "available":
      return "متوفر";
    case "unavailable":
      return "غير متوفر";
    case "substitute":
      return "بديل";
    default:
      return status;
  }
}

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} د.ل`;
}

function getRequiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

async function createQuoteAction(formData: FormData) {
  "use server";

  const requestId = getRequiredString(formData, "requestId");

  if (!requestId) {
    throw new Error("Invalid prescription quote action.");
  }

  const { error } = await createVendorPrescriptionQuote(requestId);

  if (error) {
    throw error;
  }

  revalidatePath(`/vendor/prescriptions/${requestId}`);
}

async function addQuoteItemAction(formData: FormData) {
  "use server";

  const requestId = getRequiredString(formData, "requestId");
  const quoteId = getRequiredString(formData, "quoteId");
  const itemId = getRequiredString(formData, "itemId");
  const productId = getRequiredString(formData, "productId");
  const productName = getRequiredString(formData, "productName");
  const quantity = Number(getRequiredString(formData, "quantity") || 1);
  const rawUnitPrice = getRequiredString(formData, "unitPrice");
  const availabilityStatus = getRequiredString(formData, "availabilityStatus") as PrescriptionQuoteItemAvailability;
  const note = getRequiredString(formData, "note");

  if (!requestId || !quoteId) {
    throw new Error("Invalid prescription quote item action.");
  }
  
const { error } = await upsertVendorPrescriptionQuoteItem({
  quoteId,
  itemId: itemId || null,
  productId: productId || null,
  productName,
  quantity,
  unitPrice: rawUnitPrice ? Number(rawUnitPrice) : null,
  availabilityStatus,
  note,
});

if (error) {
  throw error;
}

  revalidatePath(`/vendor/prescriptions/${requestId}`);
}

async function deleteQuoteItemAction(formData: FormData) {
  "use server";

  const requestId = getRequiredString(formData, "requestId");
  const itemId = getRequiredString(formData, "itemId");

  if (!requestId || !itemId) {
    throw new Error("Invalid prescription quote item delete action.");
  }

  const { error } = await deleteVendorPrescriptionQuoteItem(itemId);

  if (error) {
    throw error;
  }

  revalidatePath(`/vendor/prescriptions/${requestId}`);
}

async function sendQuoteAction(formData: FormData) {
  "use server";

const requestId = getRequiredString(formData, "requestId");
const quoteId = getRequiredString(formData, "quoteId");
const vendorNote = getRequiredString(formData, "vendorNote");
  if (!requestId || !quoteId) {
    throw new Error("Invalid prescription quote send action.");
  }
  
  const { error } = await sendVendorPrescriptionQuote(quoteId, vendorNote);

  if (error) {
    throw error;
  }

  revalidatePath(`/vendor/prescriptions/${requestId}`);
  revalidatePath("/vendor/prescriptions");
}

export default async function VendorPrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [
    { data: request, error },
    { data: quote, error: quoteError },
    { data: products, error: productsError },
  ] = await Promise.all([
    getVendorPrescriptionRequest(id),
    getVendorPrescriptionQuoteForRequest(id),
    listVendorQuoteProductOptions(),
  ]);

  if (error || !request) {
    notFound();
  }

  return (
    <DashboardShell
      title="متابعة الوصفة"
      subtitle="تفاصيل وصفة العميل وتحويلها لاحقاً إلى طلب"
      nav={dashboardNavigation.vendor}
    >
      <div className="stack" dir="rtl">
        <PageHeader
          title="متابعة الوصفة"
          description="راجع بيانات الوصفة قبل خطوة تحويلها إلى طلب منتجات في إصدار لاحق."
        >
          <Link href="/vendor/prescriptions" className="button secondary-button">
            العودة للوصفات
          </Link>
        </PageHeader>

        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <Card className="medical-panel">
            <div className="flex h-96 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-inner">
              {request.signedImageUrl ? (
                <a
                  href={request.signedImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-full w-full items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={request.signedImageUrl}
                    alt="Prescription"
                    className="h-full w-full rounded-xl bg-white object-contain p-2 transition hover:scale-[1.02]"
                  />
                </a>
              ) : (
                <div className="flex h-full w-full items-center justify-center rounded-xl bg-white p-4 text-center text-sm font-bold text-slate-400">
                  الصورة غير متاحة
                </div>
              )}
            </div>
            {request.signedImageUrl ? (
              <p className="mt-3 text-center text-xs font-bold text-slate-400">
                اضغط على الصورة لفتحها بحجم أكبر
              </p>
            ) : null}
          </Card>

          <div className="min-w-0 space-y-4">
            <Card className="medical-panel">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="detail-block">
                  <strong>اسم العميل</strong>
                  <span>{request.customerName}</span>
                </div>
                <div className="detail-block">
                  <strong>هاتف العميل</strong>
                  <span dir="ltr">{request.customerPhone}</span>
                </div>
                <div className="detail-block md:col-span-2">
                  <strong>العنوان</strong>
                  <span>{request.addressLine}</span>
                </div>
                <div className="detail-block">
                  <strong>الحالة</strong>
                  <span>{getStatusLabel(request.status)}</span>
                </div>
                <div className="detail-block">
                  <strong>رد الصيدلية</strong>
                  <span>{request.vendor_note || "لم يتم حفظ رد بعد"}</span>
                </div>
              </div>
            </Card>

            <Card className="medical-panel">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-slate-950">
                    تحويل الوصفة إلى عرض سعر
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-7 text-slate-500">
                    اختر المنتجات والكميات وأرسل عرضاً للعميل. لن يتم إنشاء طلب دفع عند الاستلام الآن.
                  </p>
                </div>

                {quote ? (
                  <span className="pill status-pending">
                    {getQuoteStatusLabel(quote.status)}
                  </span>
                ) : null}
              </div>

              {quoteError || productsError ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
                  تعذر تحميل بيانات عرض السعر: {(quoteError ?? productsError)?.message}
                </div>
              ) : null}

              {!quote && request.status === "accepted" ? (
                <form action={createQuoteAction} className="mt-4">
                  <input type="hidden" name="requestId" value={request.id} />
                  <button type="submit" className="button">
                    إنشاء عرض سعر
                  </button>
                </form>
              ) : null}

              {!quote && request.status !== "accepted" ? (
                <p className="mt-4 text-sm font-bold text-slate-500">
                  يجب قبول الوصفة أولاً قبل إنشاء عرض سعر.
                </p>
              ) : null}

              {quote ? (
                <div className="mt-5 space-y-4">
                  {quote.vendor_note ? (
                    <div className="detail-block">
                      <strong>ملاحظة الصيدلية</strong>
                      <span>{quote.vendor_note}</span>
                    </div>
                  ) : null}

                  {quote.items.length > 0 ? (
                    <div className="space-y-3">
{quote.items.map((item) => (
  <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <p className="text-base font-black text-slate-950">
            {item.product_name}
          </p>

          {item.availability_status === "unavailable" ? (
            <span className="pill status-danger">غير متوفر</span>
          ) : null}
        </div>

        <p className="mt-1 text-xs font-bold text-slate-500">
          {getAvailabilityLabel(item.availability_status)}
          {" · "}
          الكمية {item.quantity}
          {" · "}
          {formatCurrency(item.unit_price)}
        </p>
      </div>

      <p className="text-base font-black text-emerald-700">
        {formatCurrency(item.line_total)}
      </p>
    </div>

    {item.note ? (
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
        {item.note}
      </p>
    ) : null}

{quote.status === "draft" ? (
  <div className="mt-3 space-y-3">
    <form action={addQuoteItemAction} className="grid gap-3 md:grid-cols-2">
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="quoteId" value={quote.id} />
      <input type="hidden" name="itemId" value={item.id} />
      <input type="hidden" name="productId" value={item.product_id ?? ""} />

      <input
        name="productName"
        defaultValue={item.product_name}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
      />

      <input
        name="quantity"
        type="number"
        min="1"
        defaultValue={item.quantity}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
      />

      <input
        name="unitPrice"
        type="number"
        min="0"
        step="0.01"
        defaultValue={item.unit_price}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
      />

      <select
        name="availabilityStatus"
        defaultValue={item.availability_status}
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
      >
        <option value="available">متوفر</option>
        <option value="substitute">بديل</option>
        <option value="unavailable">غير متوفر</option>
      </select>

      <input
        name="note"
        defaultValue={item.note ?? ""}
        placeholder="ملاحظة"
        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800 md:col-span-2"
      />

      <button type="submit" className="button md:col-span-2">
        حفظ التعديل
      </button>
    </form>

    <form action={deleteQuoteItemAction} className="flex justify-end">
      <input type="hidden" name="requestId" value={request.id} />
      <input type="hidden" name="itemId" value={item.id} />
      <button type="submit" className="button danger-button">
        إزالة
      </button>
    </form>
  </div>
) : null}
  </div>
))}                    </div>
                  ) : (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold text-slate-500">
                      لم تتم إضافة عناصر بعد.
                    </div>
                  )}

                  <div className="detail-block">
                    <strong>الإجمالي الفرعي</strong>
                    <span>{formatCurrency(quote.subtotal)}</span>
                  </div>

                  {quote.status === "draft" ? (
                    <>
                      <form action={addQuoteItemAction} className="rounded-2xl border border-slate-200 bg-white p-4">
                        <input type="hidden" name="requestId" value={request.id} />
                        <input type="hidden" name="quoteId" value={quote.id} />

                        <div className="grid gap-3 md:grid-cols-2">
                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            منتج من المخزون
                            <select
                              name="productId"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                              defaultValue=""
                            >
                              <option value="">إضافة يدوية أو عنصر غير متوفر</option>
                              {products.map((product) => (
                                <option key={product.id} value={product.id}>
                                  {product.name} - {formatCurrency(product.price)} - مخزون {product.stock_quantity}
                                </option>
                              ))}
                            </select>

                            <p className="text-xs font-semibold text-slate-400">
  سيتم استخدام سعر المنتج تلقائياً إذا تُرك السعر اليدوي فارغاً.
</p>
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            اسم يدوي / بديل
                            <input
                              name="productName"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                              placeholder="مثال: بديل الدواء المتوفر"
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            الكمية
                            <input
                              name="quantity"
                              type="number"
                              min="1"
                              defaultValue="1"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            السعر اليدوي
                            <input
                              name="unitPrice"
                              type="number"
                              min="0"
                              step="0.01"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                              placeholder="اتركه فارغاً لاستخدام سعر المنتج"
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700">
                            الحالة
                            <select
                              name="availabilityStatus"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                              defaultValue="available"
                            >
                              <option value="available">متوفر</option>
                              <option value="substitute">بديل</option>
                              <option value="unavailable">غير متوفر</option>
                            </select>
                          </label>

                          <label className="grid gap-2 text-sm font-black text-slate-700 md:col-span-2">
                            ملاحظة
                            <input
                              name="note"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
                              placeholder="مثال: البديل متوفر بنفس التركيز"
                            />
                          </label>
                        </div>

                        <button type="submit" className="button mt-4">
                          إضافة إلى العرض
                        </button>
                      </form>

<form action={sendQuoteAction} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
  <input type="hidden" name="requestId" value={request.id} />
  <input type="hidden" name="quoteId" value={quote.id} />

  <label className="grid gap-2 text-sm font-black text-slate-700">
    ملاحظة للعميل مع عرض السعر
    <textarea
      name="vendorNote"
      rows={3}
      defaultValue={quote.vendor_note ?? ""}
      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold text-slate-800"
      placeholder="مثال: بعض الأدوية غير متوفرة وتم اقتراح بدائل مناسبة."
    />
  </label>

  <div className="flex justify-end">
    <button
      type="submit"
      className="button"
      disabled={quote.items.length === 0}
    >
      إرسال العرض للعميل
    </button>
  </div>
</form>                    </>
                  ) : null}

{quote.converted_order_id ? (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
    <p className="text-sm font-black text-emerald-700">
      تم تحويل عرض السعر إلى طلب بنجاح. تتم متابعة التنفيذ الآن من صفحة الطلبات.
    </p>

    <Link
      href="/vendor/orders"
      className="mt-3 inline-flex text-sm font-black text-emerald-700 underline"
    >
      فتح صفحة الطلبات
    </Link>
  </div>
) : quote.status === "accepted" ? (
  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-black text-emerald-700">
    قبل العميل العرض. بانتظار تأكيده النهائي لإنشاء الطلب.
  </div>
) : null}
                  {quote.status === "rejected" ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-black text-red-700">
                      رفض العميل هذا العرض.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </Card>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
