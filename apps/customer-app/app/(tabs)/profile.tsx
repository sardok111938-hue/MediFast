import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { useRouter } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
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
} from "../../src/components/CustomerUI";
import {
  formatSavedAddressLine,
  getPrimaryAddress,
  getSavedAddresses,
  useCustomerAddressesData,
} from "../../src/lib/customer-catalog";
import {
  signOutCustomer,
  supabase,
  updateCustomerProfile,
} from "../../src/lib/supabase";

type IconName = ComponentProps<typeof Ionicons>["name"];

function ProfileHero({ fullName }: { fullName: string }) {
  return (
    <View style={styles.heroShell}>
      <Card style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroName}>{fullName}</Text>
        </View>
      </Card>
    </View>
  );
}
function SettingRow({
  icon,
  label,
  value,
  danger = false,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.settingRow,
        pressed ? styles.settingRowPressed : null,
        disabled ? styles.settingRowDisabled : null,
        danger ? styles.settingRowDanger : null,
      ]}
    >
      <Ionicons
        name="chevron-back"
        size={18}
        color={danger ? theme.colors.danger : theme.colors.muted}
        style={styles.settingChevron}
      />

      <View style={styles.settingContent}>
        <View
          style={[
            styles.settingIconWrap,
            danger ? styles.settingIconWrapDanger : null,
          ]}
        >
          <Ionicons
            name={icon}
            size={18}
            color={danger ? theme.colors.danger : theme.colors.primaryDark}
          />
        </View>

        <View style={styles.settingTextWrap}>
          <Text
            style={[
              styles.settingLabel,
              danger ? styles.settingLabelDanger : null,
            ]}
          >
            {label}
          </Text>
          {value ? <Text style={styles.settingValue}>{value}</Text> : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerAddressesData();

  const [fullName, setFullName] = useState("الزبون");
  const [draftFullName, setDraftFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("customer@example.com");
  const [profileMessage, setProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [supportPhone, setSupportPhone] = useState("");
  const [supportWhatsapp, setSupportWhatsapp] = useState("");

  const addresses = useMemo(
    () => getSavedAddresses(data.addresses),
    [data.addresses],
  );

  const defaultAddress = useMemo(
    () => getPrimaryAddress(data.addresses, data.defaultAddressId),
    [data.addresses, data.defaultAddressId],
  );

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
        (typeof user.user_metadata.full_name === "string"
          ? user.user_metadata.full_name
          : "") ||
        "الزبون";

      setFullName(resolvedFullName);
      setDraftFullName(resolvedFullName);
      setPhone(profile?.phone ?? "");
    }

    void loadProfile();
  }, []);

  useEffect(() => {
    async function loadSupportSettings() {
      const { data } = await supabase
        .from("platform_settings")
        .select("value")
        .eq("key", "support")
        .maybeSingle();

      const value = data?.value as
        | {
            phone?: string;
            whatsapp?: string;
          }
        | null
        | undefined;

      setSupportPhone(value?.phone?.trim() ?? "");
      setSupportWhatsapp(value?.whatsapp?.trim() ?? "");
    }

    void loadSupportSettings();
  }, []);

  function openPhoneSupport() {
    if (!supportPhone) {
      return;
    }

    void Linking.openURL(`tel:${supportPhone}`);
  }

  function openWhatsappSupport() {
    if (!supportWhatsapp) {
      return;
    }

    const phoneNumber = supportWhatsapp.replace(/[^\d]/g, "");

    void Linking.openURL(`https://wa.me/${phoneNumber}`);
  }

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
      setEditingProfile(false);
      setProfileMessage("تم تحديث بيانات الحساب بنجاح.");
    } catch (error) {
      setProfileMessage(
        error instanceof Error ? error.message : "تعذر تحديث بيانات الحساب.",
      );
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
    <Screen title="الملف الشخصي" contentContainerStyle={styles.screenContent}>
      {loading ? <LoadingCard message="جارٍ تحميل بيانات الحساب..." /> : null}
      {!loading && error ? (
        <ErrorCard message={error} onRetry={() => void reload()} />
      ) : null}

      <ProfileHero fullName={fullName} />

      <Card style={styles.sectionCard}>
        <View style={styles.cardHeaderRow}>
          <SectionTitle label="بيانات الحساب" />

          <Pressable
            onPress={() => setEditingProfile((value) => !value)}
            style={({ pressed }) => [
              styles.smallEditButton,
              pressed ? styles.smallEditButtonPressed : null,
            ]}
          >
            <Ionicons
              name={editingProfile ? "close-outline" : "create-outline"}
              size={16}
              color={theme.colors.primaryDark}
            />
            <Text style={styles.smallEditText}>
              {editingProfile ? "إلغاء" : "تعديل"}
            </Text>
          </Pressable>
        </View>

        {editingProfile ? (
          <View style={styles.formStack}>
            <FormInput
              value={draftFullName}
              onChangeText={setDraftFullName}
              placeholder="الاسم الكامل"
            />
            <FormInput
              value={phone}
              onChangeText={setPhone}
              placeholder="رقم الهاتف"
              keyboardType="phone-pad"
            />
          </View>
        ) : (
          <View style={styles.profileInfoPanel}>
            <DetailRow label="الاسم" value={fullName} />
            <DetailRow label="رقم الهاتف" value={phone || "غير مضاف"} />
            <DetailRow label="البريد الإلكتروني" value={email} />
          </View>
        )}

        {profileMessage ? (
          <HelperText
            tone={profileMessage.includes("بنجاح") ? "success" : "danger"}
          >
            {profileMessage}
          </HelperText>
        ) : null}

        {editingProfile ? (
          <PrimaryButton
            label={savingProfile ? "جارٍ حفظ البيانات..." : "حفظ التغييرات"}
            onPress={() => void handleSaveProfile()}
            disabled={savingProfile}
          />
        ) : null}
      </Card>

      <View style={styles.groupBlock}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupTitle}>الإعدادات والخدمات</Text>
        </View>

        <Card style={styles.settingsCard}>
          <SettingRow
            icon="home-outline"
            label="عناويني"
            value={
              defaultAddress
                ? `العنوان الافتراضي: ${formatSavedAddressLine(defaultAddress)}`
                : addresses.length > 0
                  ? `${addresses.length} عناوين محفوظة`
                  : "أضف عنوانك الأول للتوصيل"
            }
            onPress={() =>
              router.push({
                pathname: "/address-selection",
                params: { from: "profile" },
              })
            }
          />

          <View style={styles.rowDivider} />

          <SettingRow
            icon="navigate-outline"
            label="طلباتي الحالية"
            value="تتبع الطلبات النشطة والوصفات"
            onPress={() => router.push("/(tabs)/orders")}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            icon="receipt-outline"
            label="سجل الطلبات"
            value="مراجعة الطلبات السابقة بالتفصيل"
            onPress={() => router.push("/orders/history")}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            icon="document-text-outline"
            label="رفع وصفة طبية"
            value="إرسال صورة الوصفة إلى صيدلية قريبة"
            onPress={() => router.push("/prescriptions/new")}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            icon="heart-outline"
            label="المفضلة"
            value="المنتجات المحفوظة للرجوع إليها بسرعة"
            onPress={() => router.push("/favorites")}
          />

          <View style={styles.rowDivider} />

          <SettingRow
            icon="storefront-outline"
            label="متاجري المفضلة"
            value="المتاجر التي تحفظها للطلب السريع"
            onPress={() => router.push("/favorite-pharmacies")}
          />

          <View style={styles.rowDivider} />

          <View style={styles.supportCard}>
            <View style={styles.supportTextWrap}>
              <Text style={styles.supportTitle}>الدعم</Text>
              <Text style={styles.supportSubtitle}>
                تواصل معنا عند وجود مشكلة في الطلب أو الحساب
              </Text>
            </View>

            <View style={styles.supportActions}>
              <Pressable
                style={[
                  styles.supportButton,
                  !supportPhone ? styles.supportButtonDisabled : null,
                ]}
                onPress={openPhoneSupport}
                disabled={!supportPhone}
              >
                <Ionicons
                  name="call-outline"
                  size={18}
                  color={theme.colors.primaryDark}
                />
                <Text style={styles.supportButtonText}>اتصال</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.supportButton,
                  !supportWhatsapp ? styles.supportButtonDisabled : null,
                ]}
                onPress={openWhatsappSupport}
                disabled={!supportWhatsapp}
              >
                <Ionicons
                  name="logo-whatsapp"
                  size={18}
                  color={theme.colors.primaryDark}
                />
                <Text style={styles.supportButtonText}>واتساب</Text>
              </Pressable>
            </View>
          </View>
        </Card>
      </View>

      <Pressable
        onPress={() => void handleLogout()}
        disabled={loggingOut}
        style={({ pressed }) => [
          styles.logoutButton,
          pressed ? styles.logoutButtonPressed : null,
          loggingOut ? styles.logoutButtonDisabled : null,
        ]}
      >
        <Ionicons
          name="log-out-outline"
          size={18}
          color={theme.colors.danger}
        />
        <Text style={styles.logoutText}>
          {loggingOut ? "جارٍ تسجيل الخروج..." : "تسجيل الخروج"}
        </Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: "#D2E8DA",
    borderColor: "transparent",
    paddingHorizontal: 24,
    paddingVertical: 28,
    borderRadius: 30,
  },

  heroName: {
    color: theme.colors.text,
    fontSize: 30,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 36,
  },
  heroHeader: {
    alignItems: "flex-end",
    gap: theme.spacing[8],
  },

  profileInfoPanel: {
    gap: theme.spacing[12],
  },
  sectionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: "transparent",
    borderRadius: 28,
    padding: 18,
    gap: 18,
  },
  formStack: {
    gap: theme.spacing[12],
  },
  groupBlock: {
    gap: 12,
    marginTop: 6,
  },
  groupHeader: {
    alignItems: "flex-end",
    gap: theme.spacing[4],
    paddingHorizontal: theme.spacing[4],
  },
  groupTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    textAlign: "right",
  },
  settingsCard: {
    backgroundColor: theme.colors.surface,
    borderColor: "transparent",
    borderRadius: 22,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  settingRow: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 16,
    gap: 8,
  },
  settingRowPressed: {
    backgroundColor: "#F5FAF7",
  },
  settingRowDisabled: {
    opacity: 0.65,
  },
  settingRowDanger: {
    backgroundColor: "#FFF7F7",
  },
  settingChevron: {
    marginLeft: theme.spacing[4],
  },
  settingContent: {
    flex: 1,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[8],
  },
  settingIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },

  settingIconWrapDanger: {
    backgroundColor: "#FDEDEE",
  },
  settingTextWrap: {
    flex: 1,
    alignItems: "flex-end",
    gap: 2,
  },
  settingLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "700",
    textAlign: "right",
  },
  settingLabelDanger: {
    color: theme.colors.danger,
  },
  settingValue: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    lineHeight: theme.typography.lineHeight.compact,
    textAlign: "right",
  },
  rowDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing[12],
    opacity: 0.6,
  },
  logoutButton: {
    minHeight: 58,
    borderRadius: 20,
    backgroundColor: "#FFF6F6",
    borderWidth: 0,
    paddingHorizontal: theme.spacing[16],
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[12],
    marginTop: 4,
  },
  logoutButtonPressed: {
    opacity: 0.88,
  },
  logoutButtonDisabled: {
    opacity: 0.65,
  },
  logoutText: {
    color: theme.colors.danger,
    fontSize: theme.typography.body.md,
    fontWeight: "700",
    textAlign: "right",
  },
  cardHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },

  smallEditButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3F7F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  smallEditButtonPressed: {
    opacity: 0.8,
  },

  smallEditText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  screenContent: {
    paddingBottom: 120,
  },
  supportCard: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },

  supportTextWrap: {
    alignItems: "flex-end",
    gap: 4,
  },

  supportTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },

  supportSubtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },

  supportActions: {
    flexDirection: "row-reverse",
    gap: theme.spacing[8],
  },

  supportButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 16,
    backgroundColor: "#F3F7F5",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[8],
  },

  supportButtonDisabled: {
    opacity: 0.55,
  },

  supportButtonText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  heroShell: {
    marginBottom: 16,
  },
});
