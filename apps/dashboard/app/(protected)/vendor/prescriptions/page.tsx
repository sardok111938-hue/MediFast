import { revalidatePath } from "next/cache";
import Link from "next/link";
import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import {
  listVendorPrescriptionRequests,
  respondVendorPrescriptionRequest,
  updateVendorPrescriptionRequestNote,
} from "../../../../src/features/orders/api";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-LY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

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

async function respondPrescriptionAction(formData: FormData) {
  "use server";

  const requestId = String(formData.get("requestId") ?? "");
  const nextStatus = String(formData.get("nextStatus") ?? "");

  if (!requestId || !["accepted", "rejected"].includes(nextStatus)) {
    throw new Error("Invalid prescription request action.");
  }

  const { error } = await respondVendorPrescriptionRequest(
    requestId,
    nextStatus as "accepted" | "rejected"
  );

  if (error) {
    throw error;
  }

  revalidatePath("/vendor/prescriptions");
}

async function savePrescriptionNoteAction(formData: FormData) {
  "use server";

  const requestId = String(formData.get("requestId") ?? "");
  const vendorNote = String(formData.get("vendorNote") ?? "");

  if (!requestId) {
    throw new Error("Invalid prescription request note action.");
  }

  const { error } = await updateVendorPrescriptionRequestNote(requestId, vendorNote);

  if (error) {
    throw error;
  }

  revalidatePath("/vendor/prescriptions");
  revalidatePath(`/vendor/prescriptions/${requestId}`);
}

export default async function VendorPrescriptionsPage() {
  const { data: requests, error } = await listVendorPrescriptionRequests();

  return (
    <DashboardShell
      title="الوصفات الطبية"
      subtitle="مراجعة وصفات العملاء"
      nav={dashboardNavigation.vendor}
    >
      <div className="stack">
              <div className="hero">
        <p className="text-sm font-bold text-emerald-700">الوصفات الطبية</p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">
          طلبات الوصفات من العملاء
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          راجع الوصفة، ثم اقبل أو ارفض الطلب. لا يتم تحويلها إلى طلب منتجات بعد.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          تعذر تحميل طلبات الوصفات: {error.message}
        </div>
      ) : null}

      {!error && requests.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-bold text-slate-500">
          لا توجد وصفات مرسلة لهذه الصيدلية حالياً.
        </div>
      ) : null}

      <div className="grid gap-4">
        {requests.map((request) => (
          <article
            key={request.id}
            className="overflow-hidden panel transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid min-w-0 gap-5 p-4 sm:p-5 md:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:gap-6">
              <div className="min-w-0">
                <div className="flex h-80 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3 shadow-inner md:h-72">
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
                  <p className="mt-2 text-center text-xs font-bold text-slate-400">
                    اضغط على الصورة لفتحها بحجم أكبر
                  </p>
                ) : null}
              </div>

              <div className="min-w-0 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-400">
                      {formatDate(request.created_at)}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">
                      وصفة جديدة
                    </h2>
                  </div>

                  <span className="pill status-pending">
                    {getStatusLabel(request.status)}
                  </span>
                </div>

                <div className="detail-block">
                  <p className="text-xs font-bold text-slate-400">معلومات العميل</p>

                  <div className="mt-2 space-y-2">
                    <p className="break-words text-sm font-black text-slate-900">
                      {request.customerName}
                    </p>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <p className="text-sm font-bold text-slate-600" dir="ltr">
                        {request.customerPhone}
                      </p>

                      {request.customerPhone !== "رقم غير متوفر" ? (
                        <a
                          href={`tel:${request.customerPhone}`}
                          className="inline-flex w-fit rounded-xl bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        >
                          اتصال بالعميل
                        </a>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="text-xs font-bold text-slate-400">عنوان التوصيل</p>
                  <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-800">
                    {request.addressLine}
                  </p>
                </div>

                <div className="detail-block">
                  <p className="text-xs font-bold text-slate-400">ملاحظات العميل</p>
                  <p className="mt-1 break-words text-sm font-bold leading-6 text-slate-800">
                    {request.note || "لا توجد ملاحظات"}
                  </p>
                </div>

                <form action={savePrescriptionNoteAction} className="detail-block space-y-3">
                  <input type="hidden" name="requestId" value={request.id} />
                  <label
                    htmlFor={`vendor-note-${request.id}`}
                    className="block text-xs font-bold text-slate-400"
                  >
                    رد الصيدلية للعميل
                  </label>
                  <textarea
                    id={`vendor-note-${request.id}`}
                    name="vendorNote"
                    defaultValue={request.vendor_note ?? ""}
                    rows={3}
                    placeholder="مثال: تم قبول الوصفة، سيتم التواصل معك لتأكيد الأدوية المتوفرة."
                    className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-right text-sm font-bold leading-6 text-slate-800 outline-none transition focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                  {request.vendor_note ? (
                    <p className="text-xs font-bold text-emerald-700">
                      الرد المحفوظ ظاهر للعميل.
                    </p>
                  ) : null}
                  <button type="submit" className="button secondary-button">
                    حفظ الرد
                  </button>
                </form>

                {request.status === "pending" ? (
                  <div className="flex flex-wrap justify-end gap-3">
                    <form action={respondPrescriptionAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="nextStatus" value="accepted" />
                      <button
                        type="submit"
                        className="button"
                      >
                        قبول الوصفة
                      </button>
                    </form>

                    <form action={respondPrescriptionAction}>
                      <input type="hidden" name="requestId" value={request.id} />
                      <input type="hidden" name="nextStatus" value="rejected" />
                      <button
                        type="submit"
                        className="button danger-button"
                      >
                        رفض الوصفة
                      </button>
                    </form>
                  </div>
                ) : null}

                {request.status === "accepted" ? (
                  <div className="flex justify-end">
                    <Link href={`/vendor/prescriptions/${request.id}`} className="button">
                      متابعة الوصفة
                    </Link>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
    </DashboardShell>
  );
}
