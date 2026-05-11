import { redirect } from "next/navigation";
import { VendorRegisterForm } from "../../../../src/components/auth/vendor-register-form";
import { getAuthenticatedDashboardRedirect } from "../../../../src/features/auth/guards";

export default async function VendorRegisterPage() {
  const authState = await getAuthenticatedDashboardRedirect();

  if (authState?.route) {
    redirect(authState.route);
  }

  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div className="hero" style={{ maxWidth: 760 }}>
        <div className="pill">تسجيل المتاجر</div>
        <h1>إنشاء حساب متجر جديد</h1>
        <p className="muted">
          سجّل بيانات المتجر لإنشاء حساب بائع بحالة انتظار المراجعة. بعد الاعتماد من الإدارة يمكن الوصول إلى لوحة المتجر.
        </p>
        <VendorRegisterForm />
      </div>
    </div>
  );
}
