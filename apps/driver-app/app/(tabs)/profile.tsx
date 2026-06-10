import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
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
  const [feedback, setFeedback] = useState<string | null>(null);
  const [uploadingImageField, setUploadingImageField] = useState<string | null>(
    null,
  );
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");

  useEffect(() => {
    setEmergencyContactName(driver?.emergencyContactName ?? "");
    setEmergencyContactPhone(driver?.emergencyContactPhone ?? "");
  }, [driver?.emergencyContactName, driver?.emergencyContactPhone]);

  async function handlePickDriverImage(
    field: "profile_image_url" | "passport_image_path" | "vehicle_image_path",
    label: string,
    aspect: [number, number] = [4, 3],
  ) {
    if (!driver?.driverId) {
      return;
    }

    setUploadingImageField(field);
    setFeedback(null);

    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        setFeedback("يرجى السماح بالوصول للصور.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.7,
        allowsEditing: true,
        aspect,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const asset = result.assets[0];

      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1600 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const response = await fetch(compressed.uri);
      const arrayBuffer = await response.arrayBuffer();

      const extension = "jpg";
      const filePath = `drivers/${driver.driverId}/${field}-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("driver-documents")
        .upload(filePath, arrayBuffer, {
          contentType: "image/jpeg",
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: updateError } = await supabase
        .from("drivers")
        .update({
          [field]: filePath,
        })
        .eq("id", driver.driverId);

      if (updateError) {
        throw updateError;
      }

      await refresh();

      setFeedback(`تم تحديث ${label}.`);
    } catch (nextError) {
      setFeedback(
        nextError instanceof Error ? nextError.message : `تعذر رفع ${label}.`,
      );
    } finally {
      setUploadingImageField(null);
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
      setFeedback(
        nextError instanceof Error
          ? nextError.message
          : "تعذر حفظ بيانات الطوارئ.",
      );
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
  const displayImageUrl = driver?.profileImageUrl ?? null;

  return (
    <DriverScreen
      title="الحساب"
      subtitle="بيانات السائق وحالة الاعتماد."
      compactHeader
    >
      {loading ? (
        <DriverLoadingCard message="جارٍ تحميل الحساب..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void refresh()} />
      ) : (
        <>
          <DriverCard variant="accent" compact>
            <View
              style={[styles.profileHeader, isRTL ? styles.rowReverse : null]}
            >
              <Pressable
                style={styles.avatar}
                onPress={() =>
                  void handlePickDriverImage(
                    "profile_image_url",
                    "صورة الحساب",
                    [1, 1],
                  )
                }
                disabled={uploadingImageField === "profile_image_url"}
              >
                {displayImageUrl ? (
                  <Image
                    source={{ uri: displayImageUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons
                    name="person-outline"
                    size={24}
                    color={theme.colors.primaryDark}
                  />
                )}

                <View style={styles.avatarEditBadge}>
                  <Ionicons
                    name={
                      uploadingImageField === "profile_image_url"
                        ? "cloud-upload-outline"
                        : "camera-outline"
                    }
                    size={13}
                    color="#FFFFFF"
                  />
                </View>
              </Pressable>

              <View style={styles.profileText}>
                <Text
                  style={[styles.profileName, isRTL ? styles.textRight : null]}
                  numberOfLines={1}
                >
                  {driver?.fullName ?? "السائق"}
                </Text>

                <Text
                  style={[
                    styles.driverStatText,
                    isRTL ? styles.textRight : null,
                  ]}
                >
                  🚚 {driver?.totalDeliveries ?? 0} توصيلات
                </Text>

                <View
                  style={[styles.badgeRow, isRTL ? styles.rowReverse : null]}
                >
                  <DriverBadge
                    label={driver?.isAvailable ? "متاح" : "في مهمة"}
                    tone={driver?.isAvailable ? "success" : "info"}
                  />
                </View>
              </View>
            </View>
          </DriverCard>

          <DriverCard compact>
            <DriverRow label="رقم الهاتف" value={driver?.phone ?? "-"} />
            <DriverRow label="نوع المركبة" value={driver?.vehicleType ?? "-"} />
            <DriverRow label="رقم اللوحة" value={driver?.vehiclePlate ?? "-"} />
            <DriverRow
              label="اسم الطوارئ"
              value={driver?.emergencyContactName ?? "-"}
            />
            <DriverRow
              label="هاتف الطوارئ"
              value={driver?.emergencyContactPhone ?? "-"}
            />
            <DriverRow
              label="التوفر"
              value={driver?.isAvailable ? "متاح للاستلام" : "مشغول بتوصيل"}
            />
          </DriverCard>

          <DriverCard compact>
            <Text style={[styles.cardTitle, isRTL ? styles.textRight : null]}>
              مستندات السائق
            </Text>

            <View
              style={[
                styles.documentButtonsRow,
                isRTL ? styles.rowReverse : null,
              ]}
            >
              <View style={styles.documentButton}>
                <DriverButton
                  label="رفع الجواز"
                  onPress={() =>
                    void handlePickDriverImage(
                      "passport_image_path",
                      "صورة جواز السفر",
                    )
                  }
                  disabled={uploadingImageField === "passport_image_path"}
                  loading={uploadingImageField === "passport_image_path"}
                />
              </View>

              <View style={styles.documentButton}>
                <DriverButton
                  label="رفع المركبة"
                  onPress={() =>
                    void handlePickDriverImage(
                      "vehicle_image_path",
                      "صورة المركبة",
                    )
                  }
                  disabled={uploadingImageField === "vehicle_image_path"}
                  loading={uploadingImageField === "vehicle_image_path"}
                />
              </View>
            </View>
          </DriverCard>

          <DriverCard compact>
            <Pressable
              style={styles.menuRow}
              onPress={() => router.push("/(tabs)/orders/history" as never)}
            >
              <Text style={styles.menuText}>سجل التوصيلات</Text>
              <Ionicons
                name="chevron-back"
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>

            <Pressable
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => void Linking.openURL("https://wa.me/218925431212")}
            >
              <Text style={styles.menuText}>واتساب الدعم</Text>
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
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
function DocumentUploadRow({
  title,
  uploaded,
  loading,
  buttonLabel,
  onPress,
}: {
  title: string;
  uploaded: boolean;
  loading: boolean;
  buttonLabel: string;
  onPress: () => void;
}) {
  return (
    <View style={styles.documentItem}>
      <View style={styles.documentTextBlock}>
        <Text style={styles.documentTitle}>{title}</Text>
        <Text
          style={[
            styles.documentStatus,
            uploaded ? styles.documentStatusSuccess : null,
          ]}
        >
          {uploaded ? "تم الإرسال" : "غير مرسل"}
        </Text>
      </View>

      <DriverButton
        label={loading ? "جارٍ الرفع..." : buttonLabel}
        onPress={onPress}
        disabled={loading}
        loading={loading}
      />
    </View>
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
  driverStats: {
    gap: 2,
  },

  driverStatText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    lineHeight: 18,
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
  documentsList: {
    gap: theme.spacing[8],
    paddingTop: theme.spacing[8],
  },
  documentItem: {
    gap: theme.spacing[8],
    padding: theme.spacing[12],
    borderRadius: 12,
    backgroundColor: theme.colors.accent,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  documentTextBlock: {
    gap: 2,
  },
  documentTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
  documentStatus: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  documentStatusSuccess: {
    color: theme.colors.success,
  },
  documentButtonsRow: {
    flexDirection: "row",
    gap: theme.spacing[8],
    marginTop: theme.spacing[8],
  },

  documentButton: {
    flex: 1,
  },
  menuRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  menuRowLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "700",
  },
});
