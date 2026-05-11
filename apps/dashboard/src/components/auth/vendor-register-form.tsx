"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { isDashboardSupabaseConfigured, signOutDashboardUser, signUpVendorDashboardUser } from "../../features/auth/api";
import { useLocale } from "../../lib/i18n/locale-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

type VendorRegisterFormValues = {
  email: string;
  password: string;
  fullName: string;
  vendorName: string;
  slug: string;
  phone: string;
  addressLine1: string;
  city: string;
  area: string;
  description: string;
};

const initialValues: VendorRegisterFormValues = {
  email: "",
  password: "",
  fullName: "",
  vendorName: "",
  slug: "",
  phone: "",
  addressLine1: "",
  city: "",
  area: "",
  description: "",
};

function buildSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function VendorRegisterForm() {
  const { t } = useLocale();
  const [values, setValues] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  function updateValue(key: keyof VendorRegisterFormValues, value: string) {
    setValues((current) => ({
      ...current,
      [key]: value,
      ...(key === "vendorName" && !current.slug ? { slug: buildSlug(value) } : null),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDashboardSupabaseConfigured()) {
      setMessage("أضف قيم Supabase الحقيقية في apps/dashboard/.env.local قبل إنشاء الحساب.");
      return;
    }

    if (!values.email.trim() || !values.password || !values.fullName.trim() || !values.vendorName.trim() || !values.slug.trim()) {
      setMessage("يرجى إدخال البريد الإلكتروني، كلمة المرور، الاسم الكامل، اسم المتجر، والرابط المختصر.");
      return;
    }

    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const { authResponse, vendorResponse } = await signUpVendorDashboardUser({
        email: values.email.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        vendorName: values.vendorName.trim(),
        slug: values.slug.trim(),
        phone: values.phone.trim(),
        addressLine1: values.addressLine1.trim(),
        city: values.city.trim(),
        area: values.area.trim(),
        description: values.description.trim(),
      });

      if (authResponse.error) {
        setMessage(authResponse.error.message);
        return;
      }

      if (vendorResponse?.error) {
        setMessage(vendorResponse.error.message);
        return;
      }

      setSuccess(true);

      if (authResponse.data.session) {
        await signOutDashboardUser();
      }

      setMessage("تم إنشاء حساب المتجر وإرساله لمراجعة الإدارة. إذا كان تأكيد البريد مفعّلًا، افتح رابط التأكيد ثم سجّل الدخول بعد الموافقة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إنشاء حساب المتجر الآن.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleSubmit}>
      <div className="form-grid two-column-form">
        <Input type="email" placeholder="البريد الإلكتروني" value={values.email} onChange={(event) => updateValue("email", event.target.value)} />
        <Input type="password" placeholder="كلمة المرور" value={values.password} onChange={(event) => updateValue("password", event.target.value)} />
        <Input placeholder="الاسم الكامل للمالك" value={values.fullName} onChange={(event) => updateValue("fullName", event.target.value)} />
        <Input placeholder="اسم المتجر / الصيدلية" value={values.vendorName} onChange={(event) => updateValue("vendorName", event.target.value)} />
        <Input dir="ltr" placeholder="vendor-slug" value={values.slug} onChange={(event) => updateValue("slug", event.target.value)} />
        <Input placeholder="رقم الهاتف" value={values.phone} onChange={(event) => updateValue("phone", event.target.value)} />
        <Input placeholder="العنوان" value={values.addressLine1} onChange={(event) => updateValue("addressLine1", event.target.value)} />
        <Input placeholder="المدينة" value={values.city} onChange={(event) => updateValue("city", event.target.value)} />
        <Input placeholder="المنطقة" value={values.area} onChange={(event) => updateValue("area", event.target.value)} />
        <Input placeholder="وصف مختصر للمتجر" value={values.description} onChange={(event) => updateValue("description", event.target.value)} />
      </div>

      {message ? <p className={success ? "success" : "danger"}>{t(message)}</p> : null}
      <p className="muted">
        سيتم إنشاء حساب متجر بحالة انتظار المراجعة. لا يتم إنشاء حسابات الإدارة من هذا النموذج.
      </p>

      <div className="actions">
        <Button type="submit" loading={loading}>
          {loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب متجر"}
        </Button>
        <Link className="button secondary-button" href="/login">
          العودة إلى تسجيل الدخول
        </Link>
      </div>
    </form>
  );
}
