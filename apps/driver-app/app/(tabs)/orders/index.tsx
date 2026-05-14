import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Linking, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DriverButton,
  DriverEmptyCard,
  DriverErrorCard,
  DriverLoadingCard,
  DriverMetricTile,
  DriverOrderCard,
  DriverQuickAction,
  DriverScreen,
  DriverSectionTitle,
  DriverSummaryGrid,
  DriverUtilityRow,
  shortOrderRef,
} from "../../../src/components/DriverUI";
import {
  claimAvailableOrder,
  formatCurrency,
  getCurrentDriverProfile,
  getPaymentStatusLabel,
  getStatusLabel,
  listAvailablePickupOrders,
  listCurrentDriverOrders,
  normalizeError,
  statusTone,
  type DriverOrder,
} from "../../../src/lib/driver-data";
import { subscribeToAssignedOrders, subscribeToAvailablePickupOrders, supabase } from "../../../src/lib/supabase";
import { theme } from "@medifast/ui";

function OrderFooter({ order, showTotal = true }: { order: DriverOrder; showTotal?: boolean }) {
  return (
    <>
      {showTotal ? <Text style={styles.footerText}>{formatCurrency(order.total)}</Text> : null}
      <Text style={styles.footerText}>{getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</Text>
    </>
  );
}

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

function OrderUtilities({ order, mapTarget = "dropoff" }: { order: DriverOrder; mapTarget?: "pickup" | "dropoff" }) {
  const mapInput =
    mapTarget === "pickup"
      ? { address: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng }
      : { address: order.dropoffAddress, lat: order.dropoffLat, lng: order.dropoffLng };
  const customerPhone = normalizePhoneForTel(order.customerPhone);

  return (
    <DriverUtilityRow>
      <DriverQuickAction label="اتصال" onPress={customerPhone ? () => void callCustomer(customerPhone) : undefined} disabled={!customerPhone} />
      <DriverQuickAction label="خرائط" onPress={() => void openMap(mapInput)} tone="primary" />
    </DriverUtilityRow>
  );
}

export default function DriverOrdersListScreen() {
  const router = useRouter();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  const activeOrder = useMemo(() => orders[0] ?? null, [orders]);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const profile = await getCurrentDriverProfile();
      setDriverId(profile.driverId);

      const [assignedOrders, pickupOrders] = await Promise.all([
        listCurrentDriverOrders(profile.driverId),
        listAvailablePickupOrders(),
      ]);

      setOrders(assignedOrders);
      setAvailableOrders(pickupOrders);
    } catch (nextError) {
      setError(normalizeError(nextError));
      setOrders([]);
      setAvailableOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!driverId) {
      return;
    }

    const assignedChannel = subscribeToAssignedOrders(driverId, () => {
      void loadOrders("refresh");
    });

    const availableChannel = subscribeToAvailablePickupOrders(() => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(assignedChannel);
      void supabase.removeChannel(availableChannel);
    };
  }, [driverId, loadOrders]);

  async function handleClaimOrder(orderId: string) {
    setClaimingOrderId(orderId);
    setError(null);

    try {
      await claimAvailableOrder(orderId);
      await loadOrders("refresh");
    } catch (nextError) {
      setError(normalizeError(nextError));
    } finally {
      setClaimingOrderId(null);
    }
  }

  return (
    <DriverScreen
      title="الطلبات"
      subtitle="طلبات متاحة أولًا، ثم توصيلاتك النشطة."
      scroll={false}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders("refresh")} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <DriverLoadingCard message="جارٍ تحميل الطلبات..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
        ) : (
          <>
            <DriverSummaryGrid>
              <DriverMetricTile label="طلبات متاحة" value={String(availableOrders.length)} hint="جاهزة للاستلام" />
              <DriverMetricTile label="توصيلاتي" value={String(orders.length)} hint="مسندة لك" />
              <DriverMetricTile label="التالية" value={activeOrder ? shortOrderRef(activeOrder.id) : "—"} hint={activeOrder ? activeOrder.vendorName : "لا توجد توصيلات"} />
            </DriverSummaryGrid>

            <DriverSectionTitle>طلبات متاحة</DriverSectionTitle>

            {availableOrders.length === 0 ? (
              <DriverEmptyCard title="لا توجد طلبات متاحة" message="لا توجد طلبات جاهزة للاستلام الآن." />
            ) : (
              availableOrders.map((order) => (
                <DriverOrderCard
                  key={`available-${order.id}`}
                  vendorName={order.vendorName}
                  customerName={order.customerName}
                  orderRef={`طلب ${shortOrderRef(order.id)}`}
                  statusLabel={getStatusLabel(order.orderStatus)}
                  statusTone={statusTone(order.orderStatus)}
                  pickupAddress={order.pickupAddress}
                  dropoffAddress={order.dropoffAddress}
                  action={
                    <DriverButton
                      label={claimingOrderId === order.id ? "جارٍ القبول..." : "قبول التوصيلة"}
                      onPress={() => void handleClaimOrder(order.id)}
                      disabled={Boolean(claimingOrderId)}
                    />
                  }
                  utilities={<OrderUtilities order={order} mapTarget="pickup" />}
                  footer={<OrderFooter order={order} />}
                  compact
                />
              ))
            )}

            <DriverSectionTitle>توصيلاتي</DriverSectionTitle>

            {orders.length === 0 ? (
              <DriverEmptyCard title="لا توجد توصيلات" message="ستظهر التوصيلات المقبولة أو المسندة لك هنا." />
            ) : (
              orders.map((order) => (
                <DriverOrderCard
                  key={order.id}
                  vendorName={order.vendorName}
                  customerName={order.customerName}
                  orderRef={`طلب ${shortOrderRef(order.id)}`}
                  statusLabel={getStatusLabel(order.orderStatus)}
                  statusTone={statusTone(order.orderStatus)}
                  pickupAddress={order.pickupAddress}
                  dropoffAddress={order.dropoffAddress}
                  action={
                    <DriverButton
                      label="عرض التفاصيل"
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/orders/[orderId]",
                          params: { orderId: order.id },
                        })
                      }
                    />
                  }
                  utilities={<OrderUtilities order={order} />}
                  footer={<OrderFooter order={order} showTotal={false} />}
                  compact
                />
              ))
            )}
          </>
        )}
      </ScrollView>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing[16],
    paddingBottom: theme.spacing[24],
  },
  topAction: {
    alignItems: "flex-end",
    marginBottom: -theme.spacing[4],
  },
  footerText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "600",
    lineHeight: 18,
  },
});
