import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Card, HelperText, Pill, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { ensureCustomerBootstrap, isSupabaseConfigured, supabase } from "../src/lib/supabase";

function readSessionFullName(userMetadata: Record<string, unknown> | null | undefined) {
  const fullName = userMetadata?.full_name;

  return typeof fullName === "string" ? fullName : null;
}

export default function SplashScreen() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [continueLoading, setContinueLoading] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      const response = await supabase.auth.getSession();
      const session = response.data.session;

      if (!session) {
        if (!cancelled) {
          setCheckingSession(false);
        }

        return;
      }

try {
  await ensureCustomerBootstrap({
    authUserId: session.user.id,
    fullName: readSessionFullName(session.user.user_metadata),
  });

  if (!cancelled) {
    router.replace("/home");
  }
} catch (error) {
  if (!cancelled) {
    console.log("CUSTOMER BOOTSTRAP ERROR", error);
    setSessionError(error instanceof Error ? error.message : JSON.stringify(error));
    setCheckingSession(false);
  }
}    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleContinue() {
    setContinueLoading(true);
    setSessionError(null);

    const response = await supabase.auth.getSession();
    const session = response.data.session;

    if (session) {
      try {
        await ensureCustomerBootstrap({
          authUserId: session.user.id,
          fullName: readSessionFullName(session.user.user_metadata),
        });

        router.replace("/home");
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : "تعذر تجهيز حساب العميل.");
        setContinueLoading(false);
      }

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
        <PrimaryButton
          label={continueLoading || checkingSession ? "جارٍ التحميل..." : "متابعة"}
          onPress={() => void handleContinue()}
          disabled={continueLoading || checkingSession}
        />
        {sessionError ? <HelperText>{sessionError}</HelperText> : null}
        <HelperText>
          {configured
            ? "تابع إلى تطبيق العميل. إذا لم تكن مسجل الدخول فسيتم توجيهك أولًا إلى صفحة الحساب."
            : "مصادقة Supabase غير مهيأة، لذلك سيتم فتح الصفحة الرئيسية التجريبية مباشرة."}
        </HelperText>
      </Card>
    </Screen>
  );
}