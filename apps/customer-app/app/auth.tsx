import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { Card, FormInput, HelperText, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { useCustomerI18n } from "../src/lib/i18n";
import { isSupabaseConfigured, signInCustomer, signUpCustomer, supabase } from "../src/lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        router.replace("/home");
      }
    });
  }, [router]);

  async function handleSignIn() {
    if (!configured) {
      setMessage("أضف قيم Supabase الحقيقية في apps/customer-app/.env قبل تسجيل الدخول.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await signInCustomer(email.trim(), password);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/home");
  }

  async function handleSignUp() {
    if (!configured) {
      setMessage("أضف قيم Supabase الحقيقية في apps/customer-app/.env قبل إنشاء الحساب.");
      return;
    }

    if (!fullName.trim()) {
      setMessage("الاسم الكامل مطلوب لإنشاء حساب العميل.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error, data } = await signUpCustomer({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
    });
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (!data.session) {
      setMessage("تم إنشاء الحساب بنجاح. أكّد البريد الإلكتروني في Supabase إذا كان التفعيل مطلوبًا، ثم سجّل الدخول.");
      return;
    }

    router.replace("/home");
  }

  return (
    <Screen title="Login or Sign Up" subtitle="Use real Supabase email/password auth for customer access.">
      <Card>
        <Text style={{ fontWeight: "700", textAlign: isRTL ? "right" : "left" }}>{t("Customer access")}</Text>
        <FormInput value={fullName} onChangeText={setFullName} placeholder="Full name for signup" />
        <FormInput value={email} onChangeText={setEmail} placeholder="Email address" />
        <FormInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {message ? (
          <HelperText tone={message.includes("بنجاح") ? "success" : "danger"}>{message}</HelperText>
        ) : (
          <HelperText>New customers can sign up here. Existing customers can sign in with the same form.</HelperText>
        )}
        <PrimaryButton label={loading ? "Signing in..." : "Sign in"} onPress={handleSignIn} disabled={loading} />
        <PrimaryButton label={loading ? "Creating account..." : "Sign up"} onPress={handleSignUp} disabled={loading} />
      </Card>
    </Screen>
  );
}
