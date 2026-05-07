import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Text } from "react-native";
import { Card, FormInput, HelperText, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { isSupabaseConfigured, signInCustomer, signUpCustomer, supabase } from "../src/lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
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
    <Screen title="تسجيل الدخول أو إنشاء حساب" subtitle="استخدم بريدك الإلكتروني وكلمة المرور للوصول إلى حساب العميل.">
      <Card>
        <Text style={{ fontWeight: "700", textAlign: "right" }}>دخول العميل</Text>
        <FormInput value={fullName} onChangeText={setFullName} placeholder="الاسم الكامل للتسجيل" />
        <FormInput value={email} onChangeText={setEmail} placeholder="البريد الإلكتروني" />
        <FormInput value={password} onChangeText={setPassword} placeholder="كلمة المرور" secureTextEntry />
        {message ? (
          <HelperText tone={message.includes("بنجاح") ? "success" : "danger"}>{message}</HelperText>
        ) : (
          <HelperText>يمكن للعملاء الجدد إنشاء حساب من هنا، ويمكن للعملاء الحاليين تسجيل الدخول من النموذج نفسه.</HelperText>
        )}
        <PrimaryButton label={loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"} onPress={handleSignIn} disabled={loading} />
        <PrimaryButton label={loading ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"} onPress={handleSignUp} disabled={loading} />
      </Card>
    </Screen>
  );
}
