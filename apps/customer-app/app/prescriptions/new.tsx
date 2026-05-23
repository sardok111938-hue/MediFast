import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Card, PrimaryButton, Screen } from "../../src/components/CustomerUI";

export default function NewPrescriptionScreen() {
  const router = useRouter();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const params = useLocalSearchParams<{
  selectedAddressId?: string;
}>();

const [addressId, setAddressId] = useState<string | null>(
  params.selectedAddressId ?? null
);

useEffect(() => {
  if (params.selectedAddressId) {
    setAddressId(params.selectedAddressId);
  }
}, [params.selectedAddressId]);

  const [submitting, setSubmitting] = useState(false);

  const canContinue = Boolean(imageUri && addressId && !submitting);

  async function pickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0]?.uri ?? null);
    }
  }

  function continueToPharmacies() {
    if (!canContinue || !imageUri || !addressId) {
      return;
    }

    router.push({
      pathname: "/prescriptions/pharmacies",
      params: {
        imageUri,
        note,
        addressId,
      },
    });
  }

  return (
    <Screen
      title="رفع وصفة طبية"
      subtitle="ارفع صورة الوصفة ثم اختر الصيدلية المناسبة بالقرب منك."
      backHref="/(tabs)/home"
      contentContainerStyle={styles.container}
    >
      <Pressable style={styles.uploadCard} onPress={pickImage}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <View style={styles.emptyUpload}>
            <Ionicons name="cloud-upload-outline" size={34} color={theme.colors.primary} />
            <Text style={styles.uploadTitle}>اختر صورة الوصفة</Text>
            <Text style={styles.uploadHint}>صورة واضحة تساعد الصيدلية على المراجعة بسرعة</Text>
          </View>
        )}
      </Pressable>

      <Card style={styles.card}>
        <Text style={styles.label}>ملاحظات إضافية</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="مثال: أحتاج البديل المتوفر إن لم يوجد نفس الدواء"
          placeholderTextColor="#94A3B8"
          multiline
          style={styles.noteInput}
          textAlign="right"
        />
      </Card>

      <Card style={styles.card}>
        <Text style={styles.label}>عنوان التوصيل</Text>

        <Pressable
          style={styles.addressButton}
          onPress={() => {
  router.push({
    pathname: "/address-selection",
    params: {
      from: "prescription",
    },
  });
}}
        >
          <Text style={styles.addressText}>
            {addressId ? "تم اختيار عنوان التوصيل" : "اختر عنوان التوصيل"}
          </Text>
          <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
        </Pressable>
      </Card>

      <PrimaryButton
        label="متابعة لاختيار الصيدلية"
        onPress={continueToPharmacies}
        disabled={!canContinue}
        loading={submitting}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing[32],
  },
  uploadCard: {
    minHeight: 230,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  preview: {
    width: "100%",
    height: 260,
    resizeMode: "cover",
  },
  emptyUpload: {
    minHeight: 230,
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing[8],
    padding: theme.spacing[16],
  },
  uploadTitle: {
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    color: theme.colors.text,
  },
  uploadHint: {
    fontSize: theme.typography.body.sm,
    color: theme.colors.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    borderRadius: 22,
    gap: theme.spacing[12],
  },
  label: {
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "right",
  },
  noteInput: {
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[12],
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    textAlignVertical: "top",
  },
  addressButton: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing[16],
    alignItems: "center",
    justifyContent: "space-between",
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
  },
  addressText: {
    flex: 1,
    color: theme.colors.text,
    fontWeight: "700",
    textAlign: "right",
  },
});
