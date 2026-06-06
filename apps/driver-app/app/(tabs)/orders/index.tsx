import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Location from "expo-location";
import { RefreshControl, ScrollView, StyleSheet, Text } from "react-native";

import {
  DriverButton,
  DriverCard,
  DriverErrorCard,
  DriverLoadingCard,
  DriverScreen,
} from "../../../src/components/DriverUI";

import { DriverOrdersSection } from "../../../src/components/orders";

import {
  claimAvailableOrder,
  getCurrentDriverProfile,
  listAvailablePickupOrders,
  listCurrentDriverOrders,
  normalizeError,
  updateDriverLocation,
  type DriverOrder,
} from "../../../src/lib/driver-data";

import {
  subscribeToAssignedOrders,
  subscribeToAvailablePickupOrders,
  supabase,
} from "../../../src/lib/supabase";

export default function DriverOrdersListScreen() {
  const router = useRouter();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [availableOrders, setAvailableOrders] = useState<DriverOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimingOrderId, setClaimingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
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
    },
    []
  );

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

  useEffect(() => {
    if (!driverId || orders.length === 0) {
      return;
    }

    const currentDriverId = driverId;
    let isMounted = true;
    let subscription: Location.LocationSubscription | null = null;

    async function startLocationTracking() {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!isMounted || permission.status !== "granted") {
        return;
      }

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 15000,
          distanceInterval: 25,
        },
        (location) => {
          void updateDriverLocation({
            driverId: currentDriverId,
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      );
    }

    void startLocationTracking();

    return () => {
      isMounted = false;
      subscription?.remove();
    };
  }, [driverId, orders.length]);

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
    <DriverScreen title="الطلبات" scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadOrders("refresh")}
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
{loading ? (
  <DriverLoadingCard message="جارٍ تحميل الطلبات..." />
) : error ? (
  error === "السائق غير متاح حالياً." ? (
    <DriverCard>
      <Text style={styles.unavailableText}>
        أنت غير متاح حالياً لاستقبال الطلبات.
      </Text>

      <DriverButton
        label="الذهاب للرئيسية"
        onPress={() => router.push("/(tabs)/home")}
      />
    </DriverCard>
  ) : (
    <DriverErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
  )
) : (
  <>
    <DriverOrdersSection
      title="الطلبات المتاحة"
      hint="طلبات جاهزة للاستلام من الصيدليات."
      emptyMessage="لا توجد طلبات متاحة حالياً."
      count={availableOrders.length}
      emptyTitle="لا توجد طلبات متاحة"
      orders={availableOrders}
      mode="available"
      claimingOrderId={claimingOrderId}
      onClaimOrder={(orderId) => void handleClaimOrder(orderId)}
    />

    <DriverOrdersSection
      title="توصيلاتي الحالية"
      hint="طلباتك المسندة قيد التوصيل."
      emptyMessage="لا توجد طلبات حالية."
      count={orders.length}
      emptyTitle="لا توجد توصيلات"
      orders={orders}
      mode="current"
      onOpenOrder={(orderId) =>
        router.push({
          pathname: "/(tabs)/orders/[orderId]",
          params: { orderId },
        })
      }
    />

    <DriverCard>
      <DriverButton
        label="سجل التوصيلات"
        onPress={() => router.push("/(tabs)/orders/history" as never)}
      />
    </DriverCard>
  </>
)}
      </ScrollView>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 14,
    paddingBottom: 24,
  },
  unavailableText: {
    textAlign: "center",
    fontWeight: "900",
    fontSize: 16,
    color: "#B23A48",
    marginBottom: 12,
  },
});