"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROUTES } from "../../lib/config/routes";
import { signInDashboardUser, isDashboardSupabaseConfigured, signOutDashboardUser } from "../../features/auth/api";
import { useLocale } from "../../lib/i18n/locale-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function LoginForm({ initialMessage = "" }: { initialMessage?: string | null }) {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(initialMessage ?? "");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDashboardSupabaseConfigured()) {
      setMessage("Add real Supabase env values in apps/dashboard/.env.local before signing in.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const { authResponse, role, profileError, vendorAccess } = await signInDashboardUser(email.trim(), password);

      if (authResponse.error) {
        setMessage(authResponse.error.message);
        return;
      }

      if (profileError) {
        setMessage(profileError.message);
        return;
      }

      if (role === "admin") {
        router.replace(ROUTES.admin);
        return;
      }

      if (role === "driver") {
        router.replace(ROUTES.driver);
        return;
      }

      if (role === "vendor") {
        if (vendorAccess?.error) {
          setMessage(vendorAccess.error.message);
          await signOutDashboardUser();
          return;
        }

        if (vendorAccess?.approvalStatus === "pending") {
          setMessage("حساب المتجر قيد مراجعة الإدارة. سنفعّله بعد الموافقة.");
          await signOutDashboardUser();
          return;
        }

        if (vendorAccess?.approvalStatus === "rejected") {
          setMessage("تم رفض حساب المتجر. يرجى التواصل مع الإدارة لمراجعة الطلب.");
          await signOutDashboardUser();
          return;
        }

        if (vendorAccess?.approvalStatus !== "approved" || !vendorAccess.isActive) {
          setMessage("حساب المتجر غير مفعّل حالياً. يرجى التواصل مع الإدارة.");
          await signOutDashboardUser();
          return;
        }

        router.replace(ROUTES.vendor);
        return;
      }

      setMessage("This account does not have admin, vendor, or driver dashboard access.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleLogin}>
      <Input type="email" placeholder="البريد الإلكتروني" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input type="password" placeholder="كلمة المرور" value={password} onChange={(event) => setPassword(event.target.value)} />
      {message ? <p className="danger">{t(message)}</p> : <p className="muted">{t("Use a Supabase user whose profile role is `admin`, `vendor`, or `driver`.")}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
      </Button>
      <div className="stack compact-stack">
        <Link className="button secondary-button" href="/register/vendor">
          إنشاء حساب متجر جديد
        </Link>
        <p className="muted">
          حسابات الإدارة لا تُنشأ من التسجيل العام. يجب أن يضيفها مسؤول موجود أو عملية إعداد يدوية آمنة.
        </p>
      </div>
    </form>
  );
}
