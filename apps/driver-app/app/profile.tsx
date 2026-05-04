import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { DriverBadge, DriverButton, DriverErrorCard, DriverListCard, DriverLoadingCard, DriverRow, DriverScreen } from "../src/components/DriverUI";
import { statusTone } from "../src/lib/driver-data";
import { useDriverI18n } from "../src/lib/i18n";
import { useDriverSession } from "../src/hooks/use-driver-session";
import { signOutDriver } from "../src/lib/supabase";

export default function DriverProfileScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
  const { driver, loading, error, refresh } = useDriverSession();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await signOutDriver();
    setLoggingOut(false);
    router.replace("/");
  }

  return (
    <DriverScreen
      title="Profile"
      subtitle="Your driver account details and approval state."
      action={<DriverButton label={loggingOut ? "Logging out..." : "Logout"} onPress={() => void handleLogout()} disabled={loggingOut} variant="secondary" />}
    >
      {loading ? (
        <DriverLoadingCard message="Loading your profile..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void refresh()} />
      ) : (
        <DriverListCard
          title={driver?.fullName ?? "Driver"}
          badge={<DriverBadge label={driver?.approvalStatus ?? "unknown"} tone={statusTone(driver?.approvalStatus ?? "")} />}
        >
          <DriverRow label="Availability" value={driver?.isAvailable ? "Online" : "Offline"} />
          <DriverRow label="Approval" value={driver?.approvalStatus ?? "-"} />
          <DriverRow label="Driver ID" value={driver?.driverId ?? "-"} valueTone="muted" />
          <DriverButton label="Go to Dashboard" onPress={() => router.push("/dashboard")} />
        </DriverListCard>
      )}
    </DriverScreen>
  );
}
