import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, Pill, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import { getSavedAddresses } from "../src/lib/customer-catalog";

export default function AddressSelectionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const addresses = useMemo(() => getSavedAddresses(), []);
  const [selectedAddressId, setSelectedAddressId] = useState(addresses[0]?.id ?? "");
  const backHref = from === "checkout" ? "/checkout" : "/profile";
  const backLabel = from === "checkout" ? "Back to checkout" : "Back to profile";

  return (
    <Screen title="Address Selection" subtitle="Choose the delivery address you want to use for your next pharmacy order." backHref={backHref} backLabel={backLabel}>
      <SectionTitle label="Saved addresses" />
      {addresses.map((address) => {
        const selected = address.id === selectedAddressId;

        return (
          <Card key={address.id} style={[styles.addressCard, selected ? styles.addressCardSelected : null]}>
            <View style={styles.addressHeader}>
              <View style={styles.addressCopy}>
                <Text style={styles.addressLabel}>{address.label}</Text>
                <Text style={styles.addressLine}>{address.line_1}</Text>
                {address.line_2 ? <Text style={styles.addressLine}>{address.line_2}</Text> : null}
                <Text style={styles.addressLine}>{`${address.area}, ${address.city}`}</Text>
              </View>
              {selected ? <Pill label="Selected" tone="success" /> : null}
            </View>
            <PrimaryButton
              label={selected ? "Selected address" : "Use this address"}
              variant={selected ? "primary" : "secondary"}
              onPress={() => setSelectedAddressId(address.id)}
            />
          </Card>
        );
      })}

      <Card>
        <SectionTitle label="Next step" />
        <Text style={styles.nextStepText}>After choosing an address, return to checkout or keep browsing products.</Text>
        <PrimaryButton label="Go to checkout" onPress={() => router.push("/checkout")} />
        <PrimaryButton label="Continue shopping" variant="secondary" onPress={() => router.push("/product-listing")} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  addressCard: {
    gap: theme.spacing[16],
  },
  addressCardSelected: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  addressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  addressCopy: {
    flex: 1,
    gap: 4,
  },
  addressLabel: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
  },
  addressLine: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
  },
  nextStepText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
});
