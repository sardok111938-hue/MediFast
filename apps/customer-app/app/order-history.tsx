import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, ListCard, LoadingCard, PrimaryButton, Screen, SectionTitle, StatusBadge } from "../src/components/CustomerUI";
import {
  loadCurrentCustomerOrders,
  formatCustomerCurrency,
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "../src/lib/customer-orders";
import { subscribeToCustomerOrders, supabase } from "../src/lib/supabase";

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestOrder = useMemo(() => orders[0] ?? null, [orders]);

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

  useFocusEffect(
  useCallback(() => {
    void loadOrders();
  }, [loadOrders])
);

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
    <Screen title="الطلبات" subtitle="تابع الطلبات النشطة، وراجع حالة الدفع، وافتح أي طلب حديث بسهولة." scroll={false}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadOrders("refresh")} />}
        contentContainerStyle={styles.scrollContent}
      >
        {loading ? (
          <LoadingCard message="جارٍ تحميل طلباتك..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadOrders("refresh")} />
        ) : orders.length === 0 ? (
          <EmptyCard
            title="لا توجد طلبات بعد"
            message="ستظهر طلباتك هنا بعد إتمام أول عملية شراء."
            action={<PrimaryButton label="ابدأ التسوق" onPress={() => router.push("/product-listing")} />}
          />
        ) : (
          <>
            {latestOrder ? (
              <Card style={styles.highlightCard}>
                <SectionTitle label="تتبع آخر طلب" />
                <Text style={styles.highlightTitle}>{latestOrder.vendorName}</Text>
                <HelperText>{formatCustomerDate(latestOrder.createdAt)}</HelperText>
                <View style={styles.highlightRow}>
                  <StatusBadge label={formatOrderStatusLabel(latestOrder.orderStatus)} tone={orderStatusTone(latestOrder.orderStatus)} />
                  <StatusBadge
                    label={formatCustomerPaymentStatusLabel(latestOrder.paymentStatus, latestOrder.paymentMethod)}
                    tone={orderStatusTone(latestOrder.paymentStatus)}
                  />
                </View>
                <PrimaryButton
                  label="تتبع آخر طلب"
                  onPress={() =>
                    router.push({
                      pathname: "/orders/[orderId]",
                      params: { orderId: latestOrder.id },
                    })
                  }
                />
              </Card>
            ) : null}

            <SectionTitle label="سجل الطلبات" />
            {orders.map((order) => (
              <ListCard
                key={order.id}
                title={`الطلب ${order.id}`}
                subtitle={order.vendorName}
                badge={<StatusBadge label={formatOrderStatusLabel(order.orderStatus)} tone={orderStatusTone(order.orderStatus)} />}
                onPress={() =>
                  router.push({
                    pathname: "/orders/[orderId]",
                    params: { orderId: order.id },
                  })
                }
              >
                <View style={styles.summaryGrid}>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryLabel}>الإجمالي</Text>
                    <Text style={styles.summaryValue}>{formatCustomerCurrency(order.total)}</Text>
                  </View>
                  <View style={styles.summaryTile}>
                    <Text style={styles.summaryLabel}>الدفع</Text>
                    <Text style={styles.summaryValue}>{formatCustomerPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</Text>
                  </View>
                </View>
                <HelperText>{order.deliveryAddress}</HelperText>
                <HelperText>{formatCustomerDate(order.createdAt)}</HelperText>
                <PrimaryButton
                  label="عرض التفاصيل"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/orders/[orderId]",
                      params: { orderId: order.id },
                    })
                  }
                />
              </ListCard>
            ))}
          </>
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
  highlightCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  highlightTitle: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
    textAlign: "right",
  },
  highlightRow: {
    gap: theme.spacing[8],
  },
  summaryGrid: {
    gap: 10,
  },
  summaryTile: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing[12],
    backgroundColor: theme.colors.background,
    gap: 4,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
});
