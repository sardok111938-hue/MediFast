import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { DriverButton, DriverCard, DriverHelper, DriverInput, DriverScreen } from "../src/components/DriverUI";
import { useDriverI18n } from "../src/lib/i18n";
import { isSupabaseConfigured, signInDriver, supabase } from "../src/lib/supabase";
import { theme } from "@medifast/ui";

export default function DriverLoginScreen() {
  const router = useRouter();
  const { t, isRTL } = useDriverI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    supabase.auth.getSession().then((response) => {
      if (response.data.session) {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  async function handleDriverLogin() {
    if (!configured) {
      setMessage("أضف قيم Supabase الحقيقية في apps/driver-app/.env قبل تسجيل الدخول.");
      return;
    }

    setLoading(true);
    setMessage("");
    const { error } = await signInDriver(email.trim(), password);
    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.replace("/dashboard");
  }

  return (
    <DriverScreen title="Driver Login" subtitle="Sign in with your MediFast driver account to view assigned deliveries in real time.">
      <DriverCard>
        <Text style={[styles.message, isRTL ? styles.textRight : null]}>
          {t("Approved drivers can sign in and start receiving assignment updates.")}
        </Text>
        <DriverInput value={email} onChangeText={setEmail} placeholder="Driver email" />
        <DriverInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {message ? <DriverHelper tone="danger">{message}</DriverHelper> : null}
        <DriverButton label={loading ? "Signing in..." : "Driver sign in"} onPress={handleDriverLogin} disabled={loading} loading={loading} />
      </DriverCard>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  message: {
    color: theme.colors.text,
    lineHeight: theme.typography.lineHeight.body,
  },
  textRight: {
    textAlign: "right",
  },
});
