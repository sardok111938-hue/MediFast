import { useCallback, useEffect, useMemo, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@medifast/ui";
import {
  EmptyCard,
  ErrorCard,
  ListCard,
  LoadingCard,
  Screen,
  StatusBadge,
} from "../../ui";
import {
  formatCustomerCurrency,
  formatOrderStatusLabel,
  loadCurrentCustomerOrders,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "./customer-orders";
import { subscribeToCustomerOrders, supabase } from "../../infrastructure/supabase";

export default function OrderArchiveScreen() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archivedOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          order.orderStatus === "delivered" ||
          order.orderStatus === "cancelled" ||
          order.orderStatus === "rejected",
      ),
    [orders],
  );

  const loadOrders = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
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
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
    }, [loadOrders]),
  );

  useEffect(() => {
    if (!customerId) {
      return;
    }

    const ordersChannel = subscribeToCustomerOrders(customerId, () => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(ordersChannel);
    };
  }, [customerId, loadOrders]);

  return (
    <Screen title="سجل الطلبات" backHref="/(tabs)/profile" backLabel="رجوع">
      <ScrollView
        style={styles.scrollView}
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
          <LoadingCard message="جارٍ تحميل سجل الطلبات..." />
        ) : error ? (
          <ErrorCard
            message={error}
            onRetry={() => void loadOrders("refresh")}
          />
        ) : archivedOrders.length === 0 ? (
          <EmptyCard
            title="لا يوجد سجل طلبات"
            message="الطلبات المكتملة أو الملغاة ستظهر هنا."
          />
        ) : (
          archivedOrders.map((order) => {
            const orderDate = new Intl.DateTimeFormat("ar-LY", {
              dateStyle: "medium",
            }).format(new Date(order.createdAt));

            const orderTypeLabel = order.prescriptionQuoteId
              ? "طلب وصفة طبية"
              : "طلب عادي";

            return (
              <ListCard
                key={order.id}
                title={order.vendorName}
                subtitle={`${orderTypeLabel} │ ${formatCustomerCurrency(
                  order.total,
                )} │ ${orderDate}`}
                badge={
                  <StatusBadge
                    label={formatOrderStatusLabel(order.orderStatus)}
                    tone={orderStatusTone(order.orderStatus)}
                  />
                }
                onPress={() =>
                  router.push({
                    pathname: "/orders/[orderId]",
                    params: { orderId: order.id },
                  })
                }
              />
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: theme.spacing[16],
    paddingHorizontal: theme.spacing[20],
    paddingTop: theme.spacing[12],
    paddingBottom: 132,
  },
  scrollView: {
    flex: 1,
  },
});
