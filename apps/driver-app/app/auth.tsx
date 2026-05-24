import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  DriverBadge,
  DriverButton,
  DriverCard,
  DriverHelper,
  DriverInput,
  DriverScreen,
} from "../src/components/DriverUI";
import { useDriverI18n } from "../src/lib/i18n";
import {
  isSupabaseConfigured,
  signInDriver,
  signUpDriver,
  supabase,
} from "../src/lib/supabase";
import { theme } from "@medifast/ui";

export default function DriverLoginScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const configured = isSupabaseConfigured();
  const [signupFullName, setSignupFullName] = useState("");
const [signupPhone, setSignupPhone] = useState("");
const [signupEmail, setSignupEmail] = useState("");
const [signupPassword, setSignupPassword] = useState("");
const [vehicleType, setVehicleType] = useState("");
const [vehiclePlate, setVehiclePlate] = useState("");
const [signupLoading, setSignupLoading] = useState(false);
const [signupMessage, setSignupMessage] = useState("");

async function handleDriverSignup() {
  if (!configured) {
    setSignupMessage("أضف قيم Supabase الحقيقية قبل إنشاء حساب السائق.");
    return;
  }

  if (!signupFullName.trim() || !signupPhone.trim() || !signupEmail.trim() || !signupPassword || !vehicleType.trim() || !vehiclePlate.trim()) {
    setSignupMessage("جميع بيانات طلب الانضمام مطلوبة.");
    return;
  }

  setSignupLoading(true);
  setSignupMessage("");

  try {
    const { error } = await signUpDriver({
      email: signupEmail.trim(),
      password: signupPassword,
      fullName: signupFullName.trim(),
      phone: signupPhone.trim(),
      vehicleType: vehicleType.trim(),
      vehiclePlate: vehiclePlate.trim(),
    });

    if (error) {
      setSignupMessage(error.message);
      return;
    }

    setSignupMessage("تم إرسال طلب الانضمام. سيتم تفعيل الحساب بعد موافقة الإدارة.");
  } catch (error) {
    setSignupMessage(error instanceof Error ? error.message : JSON.stringify(error));
  } finally {
    setSignupLoading(false);
  }
}

  useEffect(() => {
    supabase.auth.getSession().then((response) => {
      if (response.data.session) {
        router.replace("/(tabs)/home");
      }
    });
  }, [router]);

  async function handleDriverLogin() {
    if (!configured) {
      setMessage("أضف قيم Supabase الحقيقية في apps/driver-app/.env قبل تسجيل الدخول.");
      return;
    }

    if (!email.trim() || !password) {
      setMessage("البريد الإلكتروني وكلمة المرور مطلوبان.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await signInDriver(email.trim(), password);

      if (error) {
        setMessage(error.message);
        return;
      }

      router.replace("/(tabs)/home");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  }

  return (
    <DriverScreen
      title="بوابة السائق"
      subtitle="إدارة التوصيلات واستلام الطلبات المخصصة لك بعد اعتماد الحساب."
      compactHeader
    >
      <DriverCard variant="accent">
        <View style={[styles.heroRow, isRTL ? styles.heroRowRtl : null]}>
          <View style={styles.heroIcon}>
            <Text style={styles.heroIconText}>🚚</Text>
          </View>

          <View style={styles.heroText}>
            <Text style={[styles.heroTitle, isRTL ? styles.textRight : null]}>
              جاهز لاستلام التوصيلات؟
            </Text>
            <Text style={[styles.heroSubtitle, isRTL ? styles.textRight : null]}>
              سجّل الدخول بحساب السائق المعتمد للوصول إلى الطلبات والمسارات.
            </Text>
          </View>
        </View>

        <DriverBadge label="سائق معتمد فقط" tone="success" />
      </DriverCard>

      <DriverCard variant="elevated">
        <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>
          تسجيل الدخول
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

        <DriverHelper>
          لا يمكن الدخول إلا بعد موافقة الإدارة على حساب السائق.
        </DriverHelper>

        {message ? <DriverHelper tone="danger">{message}</DriverHelper> : null}

        <DriverButton
          label={loading ? "جارٍ تسجيل الدخول..." : "دخول إلى لوحة السائق"}
          onPress={handleDriverLogin}
          disabled={loading}
          loading={loading}
          size="lg"
        />
      </DriverCard>
      <DriverCard variant="elevated">
  <Text style={[styles.sectionTitle, isRTL ? styles.textRight : null]}>
    طلب الانضمام كسائق
  </Text>

  <DriverInput value={signupFullName} onChangeText={setSignupFullName} placeholder="الاسم الكامل" />
  <DriverInput value={signupPhone} onChangeText={setSignupPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" />

  <DriverInput
    value={signupEmail}
    onChangeText={setSignupEmail}
    placeholder="البريد الإلكتروني"
    keyboardType="email-address"
    autoCapitalize="none"
    autoCorrect={false}
  />

  <DriverInput
    value={signupPassword}
    onChangeText={setSignupPassword}
    placeholder="كلمة المرور"
    secureTextEntry
    autoCapitalize="none"
  />

  <DriverInput value={vehicleType} onChangeText={setVehicleType} placeholder="نوع المركبة مثال: سيارة / دراجة" />
  <DriverInput value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="رقم اللوحة" autoCapitalize="characters" />

  <DriverHelper>
    سيتم إنشاء الحساب بحالة انتظار، ولا يمكن الدخول إلا بعد موافقة الإدارة.
  </DriverHelper>

  {signupMessage ? (
    <DriverHelper tone={signupMessage.includes("تم") ? "success" : "danger"}>{signupMessage}</DriverHelper>
  ) : null}

  <DriverButton
    label={signupLoading ? "جارٍ إرسال الطلب..." : "إرسال طلب الانضمام"}
    onPress={handleDriverSignup}
    disabled={signupLoading}
    loading={signupLoading}
    size="lg"
  />
</DriverCard>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  heroRowRtl: {
    flexDirection: "row-reverse",
  },
  heroIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8ECE1",
  },
  heroIconText: {
    fontSize: 26,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    lineHeight: 24,
  },
  heroSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 21,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    lineHeight: 24,
  },
  textRight: {
    textAlign: "right",
  },
});