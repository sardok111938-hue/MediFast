import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import {
  DriverBadge,
  DriverButton,
  DriverCard,
  DriverErrorCard,
  DriverHelper,
  DriverInput,
  DriverLoadingCard,
  DriverRow,
  DriverScreen,
} from "../../src/components/DriverUI";
import { useDriverSession } from "../../src/hooks/use-driver-session";
import { statusTone } from "../../src/lib/driver-data";
import { useDriverI18n } from "../../src/lib/i18n";
import { signOutDriver, supabase } from "../../src/lib/supabase";

export default function DriverProfileScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
  const { driver, loading, error, refresh } = useDriverSession();

  const [loggingOut, setLoggingOut] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setEmergencyContactName(driver?.emergencyContactName ?? "");
    setEmergencyContactPhone(driver?.emergencyContactPhone ?? "");
}, [driver?.emergencyContactName, driver?.emergencyContactPhone]);
  async function handlePickProfileImage() {
    if (!driver?.driverId) {
      return;
    }

    setUploadingImage(true);
    setFeedback(null);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFeedback("يرجى السماح بالوصول للصور.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];
      setLocalImageUrl(asset.uri);
      
      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const filePath = `drivers/${driver.driverId}-${Date.now()}.jpg`;

const { error: uploadError } = await supabase.storage
  .from("driver-profiles")
  .upload(filePath, blob, {
    contentType: "image/jpeg",
  });

if (uploadError) {
  throw uploadError;
}

const { data } = supabase.storage.from("driver-profiles").getPublicUrl(filePath);
const publicUrl = data.publicUrl;

const { error: updateError } = await supabase
  .from("drivers")
  .update({
    profile_image_url: publicUrl,
  })
  .eq("id", driver.driverId);

if (updateError) {
  throw updateError;
}

void refresh();

setFeedback("تم تحديث صورة الحساب.");

    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : "تعذر رفع الصورة.");
    } finally {
      setUploadingImage(false);
    }
  }

  async function handleSaveEmergencyContact() {
    if (!driver?.driverId) return;

    setSaving(true);
    setFeedback(null);

    try {
      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          emergency_contact_name: emergencyContactName.trim() || null,
          emergency_contact_phone: emergencyContactPhone.trim() || null,
        })
        .eq("id", driver.driverId);

      if (updateError) throw updateError;

      await refresh();
      setFeedback("تم حفظ بيانات الطوارئ.");
    } catch (nextError) {
      setFeedback(nextError instanceof Error ? nextError.message : "تعذر حفظ بيانات الطوارئ.");
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);

    try {
      await signOutDriver();
      router.replace("/");
    } finally {
      setLoggingOut(false);
    }
  }
  
  const displayImageUrl = localImageUrl ?? driver?.profileImageUrl ?? null;

  return (
    <DriverScreen title="الحساب" subtitle="بيانات السائق وحالة الاعتماد." compactHeader>
      {loading ? (
        <DriverLoadingCard message="جارٍ تحميل الحساب..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void refresh()} />
      ) : (
        <>
          <DriverCard variant="accent" compact>
            <View style={[styles.profileHeader, isRTL ? styles.rowReverse : null]}>
              <Pressable
                style={styles.avatar}
                onPress={() => void handlePickProfileImage()}
                disabled={uploadingImage}
              >
                {displayImageUrl ? (
  <Image source={{ uri: displayImageUrl }} style={styles.avatarImage} />
) : (
  <Ionicons name="person-outline" size={24} color={theme.colors.primaryDark} />
)}

                <View style={styles.avatarEditBadge}>
                  <Ionicons
                    name={uploadingImage ? "cloud-upload-outline" : "camera-outline"}
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              </Pressable>

              <View style={styles.profileText}>
                <Text style={[styles.profileName, isRTL ? styles.textRight : null]} numberOfLines={1}>
                  {driver?.fullName ?? "السائق"}
                </Text>

                <Text style={[styles.profileSubtext, isRTL ? styles.textRight : null]}>
                  اضغط على الصورة لتحديثها
                </Text>

                <View style={[styles.badgeRow, isRTL ? styles.rowReverse : null]}>
                  <DriverBadge label={driver?.approvalStatus ?? "غير معروف"} tone={statusTone(driver?.approvalStatus ?? "")} />
                  <DriverBadge label={driver?.isAvailable ? "متاح" : "في مهمة"} tone={driver?.isAvailable ? "success" : "info"} />
                </View>
              </View>
            </View>
          </DriverCard>

          <DriverCard compact>
            <DriverRow label="التوفر" value={driver?.isAvailable ? "متاح للاستلام" : "مشغول بتوصيل"} />
            <DriverRow label="الاعتماد" value={driver?.approvalStatus ?? "-"} />
            <DriverRow label="رقم السائق" value={driver?.driverId ? driver.driverId.slice(0, 8) : "-"} valueTone="muted" />
          </DriverCard>

          <DriverCard compact>
            <Text style={[styles.cardTitle, isRTL ? styles.textRight : null]}>جهة اتصال الطوارئ</Text>

            <DriverInput
              value={emergencyContactName}
              onChangeText={setEmergencyContactName}
              placeholder="اسم جهة الطوارئ"
            />

            <DriverInput
              value={emergencyContactPhone}
              onChangeText={setEmergencyContactPhone}
              placeholder="رقم الطوارئ"
              keyboardType="phone-pad"
            />

            {feedback ? <DriverHelper>{feedback}</DriverHelper> : null}

            <DriverButton
              label={saving ? "جارٍ الحفظ..." : "حفظ بيانات الطوارئ"}
              onPress={() => void handleSaveEmergencyContact()}
              disabled={saving}
              loading={saving}
            />
          </DriverCard>

          <DriverButton
            label={loggingOut ? "جارٍ الخروج..." : "تسجيل الخروج"}
            onPress={() => void handleLogout()}
            disabled={loggingOut}
          />
        </>
      )}
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DFF4E8",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 28,
  },
  avatarEditBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.primaryDark,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  profileText: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  profileName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    lineHeight: 24,
  },
  profileSubtext: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    lineHeight: 24,
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
    marginTop: 2,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});