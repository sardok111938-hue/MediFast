import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text } from "react-native";
import { DriverButton, DriverCard, DriverHelper, DriverInput, DriverScreen } from "../src/components/DriverUI";
import { useDriverI18n } from "../src/lib/i18n";
import { isSupabaseConfigured, signInDriver, supabase } from "../src/lib/supabase";
import { theme } from "@medifast/ui";

export default function DriverLoginScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();

  useEffect(() => {
    supabase.auth.getSession().then((response) => {
      if (response.data.session) {
        router.replace("/(tabs)/dashboard");
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

    router.replace("/(tabs)/dashboard");
  }

  return (
    <DriverScreen title="تسجيل دخول السائق" subtitle="سجّل الدخول بحساب السائق لعرض التوصيلات المخصصة لك مباشرة.">
      <DriverCard>
        <Text style={[styles.message, isRTL ? styles.textRight : null]}>
          يمكن للسائقين المعتمدين تسجيل الدخول واستقبال تحديثات التوصيل.
        </Text>

        <DriverInput
          value={email}
          onChangeText={setEmail}
          placeholder="البريد الإلكتروني"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />

        <DriverInput
          value={password}
          onChangeText={setPassword}
          placeholder="كلمة المرور"
          secureTextEntry
          autoCapitalize="none"
        />

        {message ? <DriverHelper tone="danger">{message}</DriverHelper> : null}

        <DriverButton
          label={loading ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
          onPress={handleDriverLogin}
          disabled={loading}
          loading={loading}
        />
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
