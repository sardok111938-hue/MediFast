import { revalidatePath } from "next/cache";

import { DashboardShell } from "../../../../src/components/app-shell/dashboard-shell";
import { Card } from "../../../../src/components/ui/card";
import { PageHeader } from "../../../../src/components/ui/page-header";
import { dashboardNavigation } from "../../../../src/lib/config/navigation";
import { getSupabaseServerClient } from "../../../../src/lib/supabase/server";

type PlatformSettingKey = "delivery" | "inventory" | "support";

type PlatformSetting = {
  key: PlatformSettingKey;
  value: Record<string, unknown>;
};

async function updateSettings(formData: FormData) {
  "use server";

  const supabase = await getSupabaseServerClient();

  const delivery = {
    base_fee: Number(formData.get("base_fee") || 0),
    per_km_fee: Number(formData.get("per_km_fee") || 0),
    max_radius_km: Number(formData.get("max_radius_km") || 0),
  };

  const inventory = {
    default_low_stock_threshold: Number(
      formData.get("default_low_stock_threshold") || 0,
    ),
  };

  const support = {
    phone: String(formData.get("phone") || ""),
    whatsapp: String(formData.get("whatsapp") || ""),
  };

  const { error } = await supabase.from("platform_settings").upsert([
    {
      key: "delivery",
      value: delivery,
    },
    {
      key: "inventory",
      value: inventory,
    },
    {
      key: "support",
      value: support,
    },
  ]);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
}

async function applyLowStockThresholdToAllProducts(formData: FormData) {
  "use server";

  const supabase = await getSupabaseServerClient();

  const threshold = Number(formData.get("default_low_stock_threshold") ?? 5);

  if (Number.isNaN(threshold) || threshold < 0) {
    throw new Error("Invalid low stock threshold.");
  }

const { error } = await supabase
  .from("products")
  .update({ low_stock_threshold: threshold })
  .not("id", "is", null);
  
  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/settings");
  revalidatePath("/vendor/products");
  revalidatePath("/vendor/inventory");
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" ? value : fallback;
}

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

export default async function AdminSettingsPage() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("platform_settings")
    .select("key,value")
    .in("key", ["delivery", "inventory", "support"]);

  if (error) {
    throw new Error(error.message);
  }

  const settings = Object.fromEntries(
    ((data ?? []) as PlatformSetting[]).map((item) => [
      item.key,
      item.value,
    ]),
  ) as Record<PlatformSettingKey, Record<string, unknown>>;

  const delivery = settings.delivery ?? {};
  const inventory = settings.inventory ?? {};
  const support = settings.support ?? {};

  return (
    <DashboardShell
      title="الإعدادات"
      subtitle="إعدادات عامة لسوق ميدي فاست."
      nav={dashboardNavigation.admin}
    >
      <PageHeader
        title="الإعدادات"
        description="إدارة إعدادات التوصيل والمخزون ووسائل الدعم."
      />

      <form action={updateSettings} className="space-y-6">
        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">إعدادات التوصيل</h3>
            <p className="muted">
              التحكم في رسوم التوصيل ونطاق الخدمة.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field
              label="رسوم أساسية"
              name="base_fee"
              defaultValue={getNumber(delivery.base_fee)}
            />

            <Field
              label="رسوم لكل كيلومتر"
              name="per_km_fee"
              defaultValue={getNumber(delivery.per_km_fee)}
            />

            <Field
              label="أقصى نطاق للتوصيل"
              name="max_radius_km"
              defaultValue={getNumber(delivery.max_radius_km)}
            />
          </div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">إعدادات المخزون</h3>
            <p className="muted">
              التحكم في تنبيهات انخفاض المخزون.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
  <Field
    label="الحد الافتراضي للمخزون المنخفض"
    name="default_low_stock_threshold"
    defaultValue={getNumber(
      inventory.default_low_stock_threshold,
      5,
    )}
  />

<button
  type="submit"
  formAction={applyLowStockThresholdToAllProducts}
  className="rounded-xl border border-border px-4 py-2 text-sm font-semibold transition hover:bg-muted"
>
  تطبيق هذا الحد على كل المنتجات الحالية
</button>
</div>
        </Card>

        <Card className="space-y-5">
          <div>
            <h3 className="text-lg font-semibold">إعدادات الدعم</h3>
            <p className="muted">
              معلومات التواصل مع الدعم الفني.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <TextField
              label="رقم الهاتف"
              name="phone"
              defaultValue={getString(support.phone)}
            />

            <TextField
              label="واتساب"
              name="whatsapp"
              defaultValue={getString(support.whatsapp)}
            />
          </div>
        </Card>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            حفظ الإعدادات
          </button>
        </div>
      </form>
    </DashboardShell>
  );
}

function Field({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>

      <input
        name={name}
        type="number"
        min="0"
        step="0.01"
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}

function TextField({
  label,
  name,
  defaultValue,
}: {
  label: string;
  name: string;
  defaultValue: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">{label}</span>

      <input
        name={name}
        type="text"
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary"
      />
    </label>
  );
}