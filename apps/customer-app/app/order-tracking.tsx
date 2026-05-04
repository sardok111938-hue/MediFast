import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen } from "../src/components/CustomerUI";
import { loadCurrentCustomerOrders, normalizeCustomerOrderError, type CustomerOrder } from "../src/lib/customer-orders";

export default function OrderTrackingScreen() {
  const router = useRouter();
  const [latestOrder, setLatestOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLatestOrder = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await loadCurrentCustomerOrders();
      setLatestOrder(result.orders[0] ?? null);
    } catch (nextError) {
      setLatestOrder(null);
      setError(normalizeCustomerOrderError(nextError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLatestOrder();
  }, [loadLatestOrder]);

  return (
    <Screen title="Order Tracking" subtitle="Open your orders list to view live customer order progress.">
      {loading ? <LoadingCard message="Loading your order..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void loadLatestOrder()} /> : null}
      {!loading && !error && latestOrder ? (
        <>
          <PrimaryButton
            label="View Details"
            onPress={() =>
              router.push({
                pathname: "/orders/[orderId]",
                params: { orderId: latestOrder.id },
              })
            }
          />
          <PrimaryButton label="Open Orders" onPress={() => router.push("/order-history")} variant="secondary" />
        </>
      ) : null}
      {!loading && !error && !latestOrder ? (
        <EmptyCard title="No orders yet" message="Your customer orders will appear here after checkout." />
      ) : null}
    </Screen>
  );
}
