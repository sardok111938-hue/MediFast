import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, DetailRow, HelperText, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import { getSavedAddresses } from "../src/lib/customer-catalog";
import { signOutCustomer, supabase } from "../src/lib/supabase";

export default function ProfileScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState("Customer");
  const [email, setEmail] = useState("customer@example.com");
  const [loggingOut, setLoggingOut] = useState(false);
  const addresses = useMemo(() => getSavedAddresses(), []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user;
      if (!user) {
        return;
      }

      setFullName(String(user.user_metadata.full_name ?? "Customer"));
      setEmail(user.email ?? "customer@example.com");
    });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await signOutCustomer();
    setLoggingOut(false);
    router.replace("/");
  }

  return (
    <Screen title="Profile" subtitle="Manage your account, saved addresses, and order shortcuts.">
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{fullName.slice(0, 1).toUpperCase()}</Text>
        </View>
        <Text style={styles.fullName}>{fullName}</Text>
        <Text style={styles.email}>{email}</Text>
      </Card>

      <Card>
        <SectionTitle label="Account details" />
        <DetailRow label="Full name" value={fullName} />
        <DetailRow label="Email" value={email} />
        <DetailRow label="Preferred payment" value="Cash on delivery" />
      </Card>

      <Card>
        <SectionTitle
          label="Saved addresses"
          actionLabel="Manage"
          onAction={() =>
            router.push({
              pathname: "/address-selection",
              params: { from: "profile" },
            })
          }
        />
        <Text style={styles.addressCount}>{addresses.length} saved addresses</Text>
        <HelperText>Keep your delivery locations up to date for faster checkout.</HelperText>
        <PrimaryButton
          label="Open addresses"
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
        <SectionTitle label="Quick actions" />
        <PrimaryButton label="Track latest order" onPress={() => router.push("/order-tracking")} />
        <PrimaryButton label="View order history" variant="secondary" onPress={() => router.push("/order-history")} />
        <PrimaryButton label={loggingOut ? "Logging out..." : "Logout"} variant="ghost" onPress={() => void handleLogout()} disabled={loggingOut} />
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
  },
  email: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
  },
  addressCount: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
  },
});
