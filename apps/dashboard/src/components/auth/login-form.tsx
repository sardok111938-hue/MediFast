"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ROUTES } from "../../lib/config/routes";
import { signInDashboardUser, isDashboardSupabaseConfigured } from "../../features/auth/api";
import { useLocale } from "../../lib/i18n/locale-context";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

export function LoginForm() {
  const router = useRouter();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isDashboardSupabaseConfigured()) {
      setMessage("Add real Supabase env values in apps/dashboard/.env.local before signing in.");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const { authResponse, role, profileError } = await signInDashboardUser(email.trim(), password);

      console.log({
  role,
  profileError,
  userId: authResponse.data.user?.id,
  email: authResponse.data.user?.email,
});

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
        router.replace(ROUTES.vendor);
        return;
      }

      setMessage("This account does not have vendor or admin dashboard access.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="stack" onSubmit={handleLogin}>
      <Input type="email" placeholder="Email address" value={email} onChange={(event) => setEmail(event.target.value)} />
      <Input type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
      {message ? <p className="danger">{t(message)}</p> : <p className="muted">{t("Use a Supabase user whose profile role is `vendor` or `admin`.")}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
