import { redirect } from "next/navigation";
import { LoginForm } from "../../../src/components/auth/login-form";
import { getAuthenticatedDashboardRedirect } from "../../../src/features/auth/guards";

export default async function LoginPage() {
  const authState = await getAuthenticatedDashboardRedirect();

  if (authState?.route) {
    redirect(authState.route);
  }

  const invalidRoleMessage = authState?.user
    ? "This account is signed in but does not have dashboard access. Sign out and use an admin, vendor, or driver account."
    : null;

  return (
    <div className="page" style={{ display: "grid", placeItems: "center" }}>
      <div className="hero" style={{ maxWidth: 520 }}>
        <div className="pill">دخول ميدي فاست</div>
        <h1>تسجيل دخول الإدارة والمتجر والسائق</h1>
        <p className="muted">
          يستخدم هذا النموذج مصادقة Supabase ويقرأ دور الملف الشخصي ثم يوجّهك إلى لوحة التحكم المناسبة.
        </p>
        <LoginForm initialMessage={invalidRoleMessage} />
      </div>
    </div>
  );
}
