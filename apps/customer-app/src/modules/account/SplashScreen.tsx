import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Card, HelperText, Pill, PrimaryButton, Screen } from "../../ui";
import { registerCustomerPushToken } from "../../infrastructure/push-notifications/customer-push-token";
import { ensureCustomerBootstrap, isSupabaseConfigured, supabase } from "../../infrastructure/supabase";

function readSessionFullName(userMetadata: Record<string, unknown> | null | undefined) {
  const fullName = userMetadata?.full_name;

  return typeof fullName === "string" ? fullName : null;
}

async function bootstrapCustomerSession(session: NonNullable<Awaited<ReturnType<typeof supabase.auth.getSession>>["data"]["session"]>) {
  const bootstrap = await ensureCustomerBootstrap({
    authUserId: session.user.id,
    fullName: readSessionFullName(session.user.user_metadata),
  });

  try {
    await registerCustomerPushToken(bootstrap.customerId);
  } catch (error) {
    console.log("CUSTOMER PUSH TOKEN ERROR", error);
  }

  return bootstrap;
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
        await bootstrapCustomerSession(session);

        if (!cancelled) {
          router.replace("/(tabs)/home");
        }
      } catch (error) {
        if (!cancelled) {
          console.log("CUSTOMER BOOTSTRAP ERROR", error);
          setSessionError(error instanceof Error ? error.message : JSON.stringify(error));
          setCheckingSession(false);
        }
      }
    }

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
        await bootstrapCustomerSession(session);

        router.replace("/(tabs)/home");
      } catch (error) {
        setSessionError(error instanceof Error ? error.message : "تعذر تجهيز حساب الزبون.");
        setContinueLoading(false);
      }

      return;
    }

    if (configured) {
      router.push("/auth");
      return;
    }

    router.push("/(tabs)/home");
  }

  return (
    <Screen title="ميدي فاست" subtitle="توصيل سريع للمنتجات مع دفع نقدي عند الاستلام.">
      <Card>
        <Pill label="منصة تسوق وتوصيل سريعة" />
        <PrimaryButton
          label={continueLoading || checkingSession ? "جارٍ التحميل..." : "متابعة"}
          onPress={() => void handleContinue()}
          disabled={continueLoading || checkingSession}
        />
        {sessionError ? <HelperText>{sessionError}</HelperText> : null}
        <HelperText>
          {configured
            ? "تابع إلى تطبيق الزبون. إذا لم تكن مسجل الدخول فسيتم توجيهك أولًا إلى صفحة الحساب."
            : "مصادقة Supabase غير مهيأة، لذلك سيتم فتح الصفحة الرئيسية التجريبية مباشرة."}
        </HelperText>
      </Card>
    </Screen>
  );
}