import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  Card,
  DetailRow,
  ErrorCard,
  FormInput,
  HelperText,
  LoadingCard,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../src/components/CustomerUI";
import {
  formatSavedAddressLine,
  getPrimaryAddress,
  getSavedAddresses,
  hasSavedAddressCoordinates,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";
import { signOutCustomer, supabase, updateCustomerProfile } from "../src/lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [fullName, setFullName] = useState("العميل");
  const [draftFullName, setDraftFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("customer@example.com");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const addresses = useMemo(() => getSavedAddresses(data.addresses), [data.addresses]);
  const defaultAddress = useMemo(() => getPrimaryAddress(data.addresses, data.defaultAddressId), [data.addresses, data.defaultAddressId]);

  useEffect(() => {
    async function loadProfile() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        return;
      }

      setEmail(user.email ?? "customer@example.com");

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      const resolvedFullName =
        profile?.full_name?.trim() ||
        (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "") ||
        "العميل";

      setFullName(resolvedFullName);
      setDraftFullName(resolvedFullName);
      setPhone(profile?.phone ?? "");
    }

    void loadProfile();
  }, []);

  async function handleSaveProfile() {
    const nextFullName = draftFullName.trim();

    if (!nextFullName) {
      setProfileMessage("الاسم الكامل مطلوب.");
      return;
    }

    setSavingProfile(true);
    setProfileMessage("");

    try {
      await updateCustomerProfile({
        fullName: nextFullName,
        phone,
      });

      setFullName(nextFullName);
      setProfileMessage("تم تحديث بيانات الحساب بنجاح.");
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : "تعذر تحديث بيانات الحساب.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOutCustomer();
    setLoggingOut(false);
    router.replace("/");
  }

  return (
    <Screen title="الحساب" subtitle="أدر بيانات حسابك وعناوينك المحفوظة واختصارات الطلبات من مكان واحد.">
      {loading ? <LoadingCard message="جارٍ تحميل بيانات الحساب..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.fullName}>{fullName}</Text>
        <Text style={styles.email}>{email}</Text>
      </Card>

      <Card>
  <SectionTitle label="بيانات الحساب" />
  <FormInput value={draftFullName} onChangeText={setDraftFullName} placeholder="الاسم الكامل" />
  <FormInput value={phone} onChangeText={setPhone} placeholder="رقم الهاتف" keyboardType="phone-pad" />
  <DetailRow label="البريد الإلكتروني" value={email} />
  <DetailRow label="طريقة الدفع المفضلة" value="الدفع عند الاستلام" />

  {profileMessage ? (
    <HelperText tone={profileMessage.includes("بنجاح") ? "success" : "danger"}>
      {profileMessage}
    </HelperText>
  ) : (
    <HelperText>يظهر الاسم ورقم الهاتف في لوحة الإدارة وبيانات الطلبات.</HelperText>
  )}

  <PrimaryButton
    label={savingProfile ? "جارٍ الحفظ..." : "حفظ بيانات الحساب"}
    onPress={() => void handleSaveProfile()}
    disabled={savingProfile}
  />
</Card>

      <Card>
        <SectionTitle
          label="العناوين المحفوظة"
          actionLabel="إدارة"
          onAction={() =>
            router.push({
              pathname: "/address-selection",
              params: { from: "profile" },
            })
          }
        />
        <Text style={styles.addressCount}>{addresses.length} عناوين محفوظة</Text>
        {defaultAddress ? <Text style={styles.defaultAddressLine}>{formatSavedAddressLine(defaultAddress)}</Text> : null}
        {defaultAddress && hasSavedAddressCoordinates(defaultAddress) ? <HelperText tone="info">تم تحديد الموقع</HelperText> : null}
        <HelperText>حدّث عناوين التوصيل لديك باستمرار لتجربة دفع أسرع.</HelperText>
        <PrimaryButton
          label="فتح العناوين"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/address-selection",
              params: { from: "profile" },
            })
          }
        />
      </Card>

      <Card>
        <SectionTitle label="إجراءات سريعة" />
        <PrimaryButton label="تتبع آخر طلب" onPress={() => router.push("/order-tracking")} />
        <PrimaryButton label="عرض سجل الطلبات" variant="secondary" onPress={() => router.push("/order-history")} />
        <PrimaryButton label={loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"} variant="ghost" onPress={() => void handleLogout()} disabled={loggingOut} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
  },
  fullName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
    textAlign: "right",
  },
  email: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  addressCount: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    textAlign: "right",
  },
  defaultAddressLine: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
});