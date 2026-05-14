import { Linking } from "react-native";
import { DriverQuickAction, DriverUtilityRow } from "./DriverOrderCard";
import type { DriverOrder } from "../../lib/driver-data";

function buildGoogleMapsUrl(input: { address: string; lat?: number | null; lng?: number | null }) {
  const hasCoordinates = typeof input.lat === "number" && Number.isFinite(input.lat) && typeof input.lng === "number" && Number.isFinite(input.lng);
  const query = hasCoordinates ? `${input.lat},${input.lng}` : input.address;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

function normalizePhoneForTel(phone?: string | null) {
  if (!phone) {
    return null;
  }

  const compact = phone.trim().replace(/[^\d+]/g, "");
  const normalized = compact.startsWith("00") ? `+${compact.slice(2)}` : compact;
  const digitCount = normalized.replace(/[^\d]/g, "").length;

  return digitCount >= 6 ? normalized : null;
}

function buildPhoneUrl(phone: string) {
  return `tel:${phone}`;
}

async function openUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    return;
  }

  await Linking.openURL(url);
}

async function openMap(input: { address: string; lat?: number | null; lng?: number | null }) {
  await openUrl(buildGoogleMapsUrl(input));
}

async function callCustomer(phone: string) {
  await openUrl(buildPhoneUrl(phone));
}

export function DriverOrderUtilities({ order, mapTarget = "dropoff" }: { order: DriverOrder; mapTarget?: "pickup" | "dropoff" }) {
  const mapInput =
    mapTarget === "pickup"
      ? { address: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng }
      : { address: order.dropoffAddress, lat: order.dropoffLat, lng: order.dropoffLng };
  const customerPhone = normalizePhoneForTel(order.customerPhone);

  return (
    <DriverUtilityRow>
      <DriverQuickAction label="اتصال" onPress={customerPhone ? () => void callCustomer(customerPhone) : undefined} disabled={!customerPhone} />
      <DriverQuickAction label="خرائط" onPress={() => void openMap(mapInput)} />
    </DriverUtilityRow>
  );
}
