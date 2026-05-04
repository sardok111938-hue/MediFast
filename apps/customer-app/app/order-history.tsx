import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { RefreshControl, ScrollView } from "react-native";
import { DetailRow, EmptyCard, ErrorCard, ListCard, LoadingCard, PrimaryButton, Screen, StatusBadge } from "../src/components/CustomerUI";
import { useCustomerI18n } from "../src/lib/i18n";
import {
  loadCurrentCustomerOrders,
  formatCustomerCurrency,
  formatCustomerDate,
  formatOrderStatusLabel,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../src/lib/customer-orders";
import { subscribeToCustomerOrders, supabase } from "../src/lib/supabase";

export default function OrderHistoryScreen() {
  const router = useRouter();
  const { t } = useCustomerI18n();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = useCallback(async (mode: "initial" | "refresh" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const result = await loadCurrentCustomerOrders();
      setCustomerId(result.customerId);
      setOrders(result.orders);
    } catch (nextError) {
      setOrders([]);
      setError(normalizeCustomerOrderError(nextError));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    if (!customerId) {
      return;
    }

    const channel = subscribeToCustomerOrders(customerId, () => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [customerId, loadOrders]);

  return (
    <Screen title="Your Orders" subtitle="Track current deliveries and review recent customer orders." scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders("refresh")} />}
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
      >
        <PrimaryButton label="Back to Home" onPress={() => router.push("/home")} variant="ghost" />

        {loading ? (
          <LoadingCard message="Loading your orders..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
        ) : orders.length === 0 ? (
          <EmptyCard title="No orders yet" message="Your customer orders will appear here after checkout." />
        ) : (
          orders.map((order) => (
            <ListCard
              key={order.id}
              title={`${t("Orders")} ${order.id}`}
              subtitle={order.vendorName}
              badge={<StatusBadge label={formatOrderStatusLabel(order.orderStatus)} tone={orderStatusTone(order.orderStatus)} />}
            >
              <DetailRow label="Total" value={formatCustomerCurrency(order.total)} />
              <DetailRow label="Payment Status" value={formatOrderStatusLabel(order.paymentStatus)} />
              <DetailRow label="Delivery Address" value={order.deliveryAddress} />
              <DetailRow label="Created" value={formatCustomerDate(order.createdAt)} />
              <PrimaryButton
                label="View Details"
                onPress={() =>
                  router.push({
                    pathname: "/orders/[orderId]",
                    params: { orderId: order.id },
                  })
                }
              />
            </ListCard>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
