import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Card, HelperText, Pill, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { useCustomerI18n } from "../src/lib/i18n";
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
    <Screen title="MediFast" subtitle="Fast pharmacy delivery with cash on delivery checkout for MVP.">
      <Card>
        <Pill label="Express pharmacy marketplace" />
        <PrimaryButton label={continueLoading || checkingSession ? "Loading..." : "Continue"} onPress={() => void handleContinue()} disabled={continueLoading || checkingSession} />
        <HelperText>
          {configured
            ? "Continue into the real customer app. If you're signed out, you'll be taken to login first."
            : "Supabase auth is not configured, so Continue opens the MVP home directly."}
        </HelperText>
      </Card>
    </Screen>
  );
}
