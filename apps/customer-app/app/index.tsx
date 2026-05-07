import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Card, HelperText, Pill, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { isSupabaseConfigured, supabase } from "../src/lib/supabase";

export default function SplashScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [continueLoading, setContinueLoading] = useState(false);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    supabase.auth.getSession().then((response) => {
      if (response.data.session) {
        router.replace("/home");
        return;
      }

      setCheckingSession(false);
    });
  }, [router]);

  async function handleContinue() {
    setContinueLoading(true);
    const response = await supabase.auth.getSession();

    if (response.data.session) {
      router.replace("/home");
      return;
    }

    if (configured) {
      router.push("/auth");
      return;
    }

    router.push("/home");
  }

  return (
    <Screen title="ميدي فاست" subtitle="توصيل صيدلية سريع مع دفع نقدي عند الاستلام.">
      <Card>
        <Pill label="منصة صيدلية سريعة" />
        <PrimaryButton label={continueLoading || checkingSession ? "جارٍ التحميل..." : "متابعة"} onPress={() => void handleContinue()} disabled={continueLoading || checkingSession} />
        <HelperText>
          {configured
            ? "تابع إلى تطبيق العميل. إذا لم تكن مسجل الدخول فسيتم توجيهك أولًا إلى صفحة الحساب."
            : "مصادقة Supabase غير مهيأة، لذلك سيتم فتح الصفحة الرئيسية التجريبية مباشرة."}
        </HelperText>
      </Card>
    </Screen>
  );
}
