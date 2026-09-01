import { theme } from "@medifast/ui";
import { useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Card, PrimaryButton, Screen } from "../../src/components/CustomerUI";
import { supabase } from "../../src/lib/supabase";

import {
  createPrescriptionRequest,
  uploadPrescriptionImage,
} from "../../src/lib/prescription-requests";

import {
  calculateDistanceKm,
  formatDistanceKm,
  getPrimaryAddress,
  isVendorWithinDeliveryRadius,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";

export default function PrescriptionPharmaciesScreen() {
  const { imageUri, note, addressId } = useLocalSearchParams<{
    imageUri?: string;
    note?: string;
    addressId?: string;
  }>();

  const { data, loading, error } = useCustomerCatalogData();
  const [submittingVendorId, setSubmittingVendorId] = useState<string | null>(null);

  const selectedAddress =
    data.addresses.find((address) => address.id === addressId) ??
    getPrimaryAddress(data.addresses, data.defaultAddressId);

  const nearbyVendors = data.vendors
    .filter((vendor) => isVendorWithinDeliveryRadius(selectedAddress, vendor))
    .filter((vendor) => vendor.vendor_type === "pharmacy")
    .map((vendor) => ({
      vendor,
      distanceKm: calculateDistanceKm(selectedAddress, vendor),
    }))
    .sort((left, right) => {
      if (left.distanceKm === null) return 1;
      if (right.distanceKm === null) return -1;

      return left.distanceKm - right.distanceKm;
    });

  return (
    <Screen
      title="اختر الصيدلية"
      subtitle="اختر الصيدلية التي تريد إرسال الوصفة إليها للمراجعة."
      backHref="/prescriptions/new"
      contentContainerStyle={styles.container}
    >

      {loading ? (
        <Card style={styles.card}>
          <Text style={styles.label}>جارٍ تحميل الصيدليات القريبة...</Text>
        </Card>
      ) : null}

      {!loading && error ? (
        <Card style={styles.card}>
          <Text style={styles.errorText}>{error}</Text>
        </Card>
      ) : null}

      {!loading && !error && !selectedAddress ? (
        <Card style={styles.card}>
          <Text style={styles.errorText}>اختر عنوان التوصيل أولًا.</Text>
        </Card>
      ) : null}

      {!loading && !error && selectedAddress && nearbyVendors.length === 0 ? (
        <Card style={styles.card}>
          <Text style={styles.label}>لا توجد صيدليات قريبة لهذا العنوان.</Text>
        </Card>
      ) : null}

      {!loading && !error ? (
        <View style={styles.list}>
{nearbyVendors.map(({ vendor, distanceKm }) => (
  <View
    key={vendor.id}
    style={styles.vendorCard}
  >
    <View style={styles.vendorHeader}>
                      <Text style={styles.vendorName}>{vendor.name}</Text>

                <View
                  style={[
                    styles.statusBadge,
                    vendor.is_open ? styles.statusBadgeOpen : styles.statusBadgeClosed,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      vendor.is_open ? styles.statusBadgeTextOpen : styles.statusBadgeTextClosed,
                    ]}
                  >
                    {vendor.is_open ? "مفتوحة" : "مغلقة"}
                  </Text>
                </View>
              </View>

<Text style={styles.vendorAddress}>
  {vendor.address || "عنوان غير متوفر"}
</Text>

<Text style={styles.vendorDistance}>
  {formatDistanceKm(distanceKm)}
</Text>

<Text style={styles.vendorAction}>
  إرسال الوصفة إلى هذه الصيدلية
</Text>

<PrimaryButton
  label={submittingVendorId === vendor.id ? "جارٍ الإرسال..." : "إرسال الوصفة"}
  disabled={submittingVendorId !== null}
  loading={submittingVendorId === vendor.id}
  onPress={async () => {
    if (!imageUri || !selectedAddress || !addressId) {
      Alert.alert("خطأ", "بيانات الوصفة غير مكتملة");
      return;
    }

    try {
      setSubmittingVendorId(vendor.id);

      const customerIdResult = await supabase.rpc("get_customer_id");

      if (customerIdResult.error) {
        throw customerIdResult.error;
      }

      const customerId = customerIdResult.data;

      if (!customerId) {
        throw new Error("Customer not found");
      }

      const requestId = `${Date.now()}-${Math.random()
  .toString(36)
  .slice(2, 10)}`;

      const imagePath = await uploadPrescriptionImage({
        customerId,
        requestId,
        imageUri,
      });

      await createPrescriptionRequest({
        customerId,
        vendorId: vendor.id,
        addressId,
        imagePath,
        note,
      });

      Alert.alert(
        "تم الإرسال",
        `تم إرسال الوصفة إلى ${vendor.name}`
      );
    } catch (submissionError) {
      Alert.alert(
        "تعذر إرسال الوصفة",
        submissionError instanceof Error
          ? submissionError.message
          : "حدث خطأ غير متوقع"
      );
    } finally {
      setSubmittingVendorId(null);
    }
  }}
/>

</View>
))}

        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: theme.spacing[32],
  },
  card: {
    borderRadius: 22,
    gap: theme.spacing[8],
  },
  label: {
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "right",
  },
  errorText: {
    color: theme.colors.danger,
    fontWeight: "700",
    textAlign: "right",
    lineHeight: 22,
  },
  list: {
    gap: theme.spacing[12],
  },
  vendorCard: {
    minHeight: 260,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[16],
    gap: theme.spacing[12],
  },
  vendorHeader: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vendorName: {
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
    color: theme.colors.text,
    textAlign: "right",
  },
  vendorAddress: {
    color: theme.colors.muted,
    textAlign: "right",
    lineHeight: 22,
  },
  vendorDistance: {
    color: theme.colors.primary,
    fontWeight: "700",
    textAlign: "right",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusBadgeOpen: {
    backgroundColor: "#DCFCE7",
  },
  statusBadgeClosed: {
    backgroundColor: "#F1F5F9",
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  statusBadgeTextOpen: {
    color: "#166534",
  },
  statusBadgeTextClosed: {
    color: "#64748B",
  },
  vendorAction: {
  color: theme.colors.primary,
  fontWeight: "800",
  textAlign: "right",
},
});
