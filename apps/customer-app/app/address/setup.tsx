import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { PrimaryButton, Screen } from "../../src/components/CustomerUI";
import * as Location from "expo-location";
import { useState } from "react";
import { supabase } from "../../src/lib/supabase";

export default function AddressSetupScreen() {
  const router = useRouter();
  const [loadingLocation, setLoadingLocation] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleUseCurrentLocation() {
  try {
    setLoadingLocation(true);
    setError(null);

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== "granted") {
      setError("لم يتم السماح بالوصول إلى الموقع.");
      return;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const { data: customerId, error: customerError } = await supabase.rpc("get_customer_id");

if (customerError || !customerId) {
  throw new Error("Customer account not found.");
}

const { data: address, error: addressError } = await supabase
  .from("addresses")
  .insert({
    customer_id: customerId,
    line_1: "موقعي الحالي",    
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  })
  .select("id")
  .single();

if (addressError) {
  console.log("ADDRESS_INSERT_ERROR", JSON.stringify(addressError, null, 2));
  throw addressError;
}

if (!address) {
  throw new Error("Could not save address.");
}

const { error: updateCustomerError } = await supabase
  .from("customers")
  .update({
    default_address_id: address.id,
  })
  .eq("id", customerId);

if (updateCustomerError) {
  throw new Error("Could not set default address.");
}

router.replace("/home");

  } catch (nextError) {
  console.log("SAVE_LOCATION_ADDRESS_ERROR", nextError);
  setError("تعذر حفظ موقعك الحالي.");
}
  
  finally {
    setLoadingLocation(false);
  }
}

  return (
    <Screen title="عنوان التوصيل" subtitle="اختر طريقة تحديد موقعك">
      <View style={styles.container}>
        <View style={styles.iconWrap}>
          <Ionicons
            name="location"
            size={44}
            color={theme.colors.primary}
          />
        </View>

        <Text style={styles.title}>
          أضف عنوان التوصيل
        </Text>

        <Text style={styles.subtitle}>
          نحتاج موقعك لإظهار الصيدليات القريبة
          وحساب رسوم التوصيل بدقة.
        </Text>

        <View style={styles.actions}>
          <PrimaryButton
  label={loadingLocation ? "جارٍ تحديد الموقع..." : "📍 استخدام موقعي الحالي"}
  onPress={() => void handleUseCurrentLocation()}
  disabled={loadingLocation}
/>
{error ? <Text style={styles.errorText}>{error}</Text> : null}

          <PrimaryButton
            label="🗺 اختيار من الخريطة"
            variant="secondary"
            onPress={() => router.push("/address-selection")}
          />

          <PrimaryButton
  label="✍️ إدخال العنوان يدوياً"
  variant="ghost"
  onPress={() => router.push("/address-selection")}
/>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: 40,
  },

  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E9F7EF",
    alignSelf: "center",
    marginBottom: 24,
  },

  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 12,
  },

  subtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    paddingHorizontal: 24,
    marginBottom: 40,
  },

  actions: {
    gap: 14,
  },
  errorText: {
  color: "#B42318",
  fontSize: 13,
  fontWeight: "700",
  textAlign: "center",
},
});