import * as Location from "expo-location";
import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Modal, StyleSheet, Text, View } from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "@medifast/ui";
import { supabase } from "../src/lib/supabase";
import {
  Card,
  EmptyCard,
  ErrorCard,
  FormInput,
  HelperText,
  LoadingCard,
  Pill,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../src/components/CustomerUI";
import {
  formatSavedAddressLine,
  getSavedAddresses,
  hasSavedAddressCoordinates,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";

type AddressFormState = {
  line1: string;
};

type InsertedAddressRow = {
  id: string;
};

const initialAddressForm: AddressFormState = {
  line1: "",
};

function normalizeAddressError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return `${fallback} ${error.message}`;
  }

  return fallback;
}

function validateAddressForm(values: AddressFormState) {
  if (!values.line1.trim()) {
    return "اكتب عنوانك بالتفصيل.";
  }

  return null;
}

export default function AddressSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const addresses = useMemo(() => getSavedAddresses(data.addresses), [data.addresses]);

  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [addressForm, setAddressForm] = useState<AddressFormState>(initialAddressForm);
  const [savingAddressId, setSavingAddressId] = useState<string | null>(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | null>(null);
  const [selectedLng, setSelectedLng] = useState<number | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [mapCenterLat, setMapCenterLat] = useState(24.7136);
  const [mapCenterLng, setMapCenterLng] = useState(46.6753);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  const backHref = from === "checkout" ? "/checkout" : "/profile";
  const backLabel = from === "checkout" ? "العودة إلى الدفع" : "العودة إلى الحساب";
  const nextStepPrimaryLabel = from === "checkout" ? "العودة إلى الدفع" : "العودة إلى الحساب";

  useEffect(() => {
    const hasDefaultAddress = Boolean(
      data.defaultAddressId && addresses.some((address) => address.id === data.defaultAddressId)
    );
    const selectedStillExists = addresses.some((address) => address.id === selectedAddressId);

    if (hasDefaultAddress) {
      setSelectedAddressId(String(data.defaultAddressId));
      return;
    }

    if (!selectedStillExists) {
      setSelectedAddressId("");
    }
  }, [addresses, data.defaultAddressId, selectedAddressId]);

  function updateAddressLine(value: string) {
    setAddressForm({ line1: value });
  }

  function navigateAfterSuccess() {
    if (from === "checkout") {
      router.replace("/checkout");
    }
  }

  async function openMapPicker() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (permission.status === "granted") {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        setMapCenterLat(position.coords.latitude);
        setMapCenterLng(position.coords.longitude);
      }
    } catch {
      // Open default map center if current location fails.
    }

    setMapVisible(true);
  }

  async function loadCustomerId() {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) throw authError;
    if (!user) throw new Error("سجّل الدخول أولًا لحفظ العنوان.");

    const { data: customerId, error: customerError } = await supabase.rpc("get_customer_id");

    if (customerError) throw customerError;
    if (!customerId) throw new Error("تعذر تحديد حساب العميل. سجّل الدخول مرة أخرى.");

    return String(customerId);
  }

  async function updateDefaultAddress(customerId: string, addressId: string) {
    const { data: updatedCustomer, error: updateError } = await supabase
      .from("customers")
      .update({ default_address_id: addressId })
      .eq("id", customerId)
      .select("id")
      .maybeSingle();

    if (updateError) throw updateError;
    if (!updatedCustomer?.id) throw new Error("تعذر تحديث عنوان التوصيل الافتراضي.");
  }

  async function selectAddress(addressId: string) {
    setSavingAddressId(addressId);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const customerId = await loadCustomerId();
      await updateDefaultAddress(customerId, addressId);
      setSelectedAddressId(addressId);
      setSaveSuccess("تم اختيار عنوان التوصيل بنجاح.");
      await reload();
      navigateAfterSuccess();
    } catch (nextError) {
      setSaveError(normalizeAddressError(nextError, "تعذر حفظ العنوان."));
    } finally {
      setSavingAddressId(null);
    }
  }

  async function handleCreateAddress() {
    const validationError = validateAddressForm(addressForm);

    if (validationError) {
      setSaveError(validationError);
      setSaveSuccess(null);
      return;
    }

    setCreatingAddress(true);
    setSaveError(null);
    setSaveSuccess(null);

    try {
      const customerId = await loadCustomerId();
      const { data: insertedAddress, error: insertError } = await supabase
        .from("addresses")
        .insert({
          customer_id: customerId,
          line_1: addressForm.line1.trim(),
          lat: selectedLat ?? null,
          lng: selectedLng ?? null,
        })
        .select("id")
        .single();

      if (insertError) throw insertError;

      const createdAddressId = (insertedAddress as InsertedAddressRow | null)?.id;
      if (!createdAddressId) throw new Error("تعذر حفظ العنوان الجديد.");

      await updateDefaultAddress(customerId, createdAddressId);
      setAddressForm(initialAddressForm);
      setSelectedLat(null);
      setSelectedLng(null);
      setSelectedAddressId(createdAddressId);
      setSaveSuccess("تمت إضافة العنوان وتعيينه عنوانًا افتراضيًا.");
      await reload();
      navigateAfterSuccess();
    } catch (nextError) {
      setSaveError(normalizeAddressError(nextError, "تعذر إضافة العنوان الجديد."));
    } finally {
      setCreatingAddress(false);
    }
  }

  return (
    <Screen title="اختيار العنوان" subtitle="اكتب عنوان التوصيل بالتفصيل أو اختر عنوانًا محفوظًا." backHref={backHref} backLabel={backLabel}>
      {loading ? <LoadingCard message="جارٍ تحميل العناوين..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}
      {saveError ? <ErrorCard message={saveError} /> : null}

      {saveSuccess ? (
        <Card style={styles.successCard}>
          <HelperText tone="success">{saveSuccess}</HelperText>
        </Card>
      ) : null}

      <Card>
        <SectionTitle label="إضافة عنوان جديد" />
        <Text style={styles.fieldLabel}>العنوان</Text>

        <FormInput
          value={addressForm.line1}
          onChangeText={updateAddressLine}
          placeholder="اكتب عنوانك بالتفصيل"
          multiline
          numberOfLines={4}
        />

        <PrimaryButton
          label="اختيار الموقع من الخريطة"
          variant="secondary"
          onPress={() => void openMapPicker()}
          disabled={creatingAddress || savingAddressId !== null}
        />

        <HelperText tone={selectedLat !== null && selectedLng !== null ? "success" : "info"}>
          {selectedLat !== null && selectedLng !== null
            ? `تم تحديد الموقع: ${selectedLat.toFixed(6)}, ${selectedLng.toFixed(6)}`
            : "لم يتم تحديد الموقع"}
        </HelperText>

        <PrimaryButton
          label={creatingAddress ? "جارٍ حفظ العنوان..." : "حفظ العنوان"}
          onPress={() => void handleCreateAddress()}
          disabled={creatingAddress || savingAddressId !== null}
        />
      </Card>

      <Modal visible={mapVisible} animationType="slide">
        <Screen title="اختيار الموقع من الخريطة" subtitle="اضغط على الخريطة لتحديد الموقع.">
          <View style={styles.mapBox}>
            <WebView
              style={styles.map}
              originWhitelist={["*"]}
              source={{
                html: `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                      <style>
                        html, body, #map { height: 100%; margin: 0; padding: 0; }
                      </style>
                    </head>
                    <body>
                      <div id="map"></div>
                      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                      <script>
                        const map = L.map('map').setView([${mapCenterLat}, ${mapCenterLng}], 15);

                        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                          attribution: '&copy; OpenStreetMap contributors'
                        }).addTo(map);

                        let marker = L.marker([${mapCenterLat}, ${mapCenterLng}]).addTo(map);

                        map.on('click', function(e) {
                          const lat = e.latlng.lat;
                          const lng = e.latlng.lng;

                          marker.setLatLng([lat, lng]);

                          window.ReactNativeWebView.postMessage(
                            JSON.stringify({ lat, lng })
                          );
                        });
                      </script>
                    </body>
                  </html>
                `,
              }}
              onMessage={(event) => {
                try {
                  const nextLocation = JSON.parse(event.nativeEvent.data);
                  setSelectedLat(nextLocation.lat);
                  setSelectedLng(nextLocation.lng);
                  setMapVisible(false);
                } catch {
                  setMapVisible(false);
                }
              }}
            />
          </View>

          <PrimaryButton label="إلغاء" variant="secondary" onPress={() => setMapVisible(false)} />
        </Screen>
      </Modal>

      <SectionTitle label="العناوين المحفوظة" />
      {!loading && !error && addresses.length === 0 ? (
        <EmptyCard title="لا توجد عناوين محفوظة" message="أضف عنوان التوصيل حتى تتمكن من إكمال الطلب." />
      ) : null}

      {addresses.map((address) => {
        const selected = address.id === selectedAddressId;
        const isDefault = address.id === data.defaultAddressId;

        return (
          <Card key={address.id} style={[styles.addressCard, selected ? styles.addressCardSelected : null]}>
            <View style={styles.addressHeader}>
              <View style={styles.addressCopy}>
                <Text style={styles.addressLine}>{formatSavedAddressLine(address)}</Text>
                {hasSavedAddressCoordinates(address) ? <HelperText tone="info">تم تحديد الموقع</HelperText> : null}
              </View>

              {isDefault ? <Pill label="العنوان الافتراضي" tone="success" /> : selected ? <Pill label="محدد" tone="info" /> : null}
            </View>

            <PrimaryButton
              label={savingAddressId === address.id ? "جارٍ الحفظ..." : isDefault ? "العنوان المحدد" : "استخدام هذا العنوان"}
              variant={isDefault ? "primary" : "secondary"}
              disabled={savingAddressId !== null || creatingAddress}
              onPress={() => void selectAddress(address.id)}
            />
          </Card>
        );
      })}

      <Card>
        <SectionTitle label="الخطوة التالية" />
        <Text style={styles.nextStepText}>بعد اختيار العنوان أو إضافته يمكنك العودة إلى الدفع أو متابعة تصفح المنتجات.</Text>
        <PrimaryButton label={nextStepPrimaryLabel} onPress={() => router.replace(backHref as never)} />
        <PrimaryButton label="متابعة التسوق" variant="secondary" onPress={() => router.push("/product-listing")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  successCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  addressCard: {
    gap: theme.spacing[16],
  },
  addressCardSelected: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  addressHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  addressCopy: {
    flex: 1,
    gap: 4,
  },
  addressLine: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  fieldLabel: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body.sm,
    textAlign: "right",
  },
  nextStepText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 24,
    textAlign: "right",
  },
  mapBox: {
    flex: 1,
    minHeight: 500,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  map: {
    flex: 1,
  },
});