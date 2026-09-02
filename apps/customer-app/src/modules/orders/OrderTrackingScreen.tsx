import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, LoadingCard, PrimaryButton, Screen, StatusBadge } from "../../ui";
import {
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  isActiveCustomerOrder,
  loadCurrentCustomerOrders,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "./customer-orders";

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
      setLatestOrder(result.orders.find(isActiveCustomerOrder) ?? null);
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
    <Screen title="تتبع الطلب" subtitle="افتح أحدث طلب لديك مباشرةً واستمر في متابعة مسار التوصيل.">
      {loading ? <LoadingCard message="جارٍ تحميل الطلب..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void loadLatestOrder()} /> : null}
      {!loading && !error && latestOrder ? (
        <Card style={styles.trackerCard}>
          <Text style={styles.orderVendor}>{latestOrder.vendorName}</Text>
          <HelperText>{formatCustomerDate(latestOrder.createdAt)}</HelperText>
          <View style={styles.badgeStack}>
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
          <PrimaryButton label="فتح الطلبات" onPress={() => router.push("/(tabs)/orders")} variant="secondary" />
        </Card>
      ) : null}
      {!loading && !error && !latestOrder ? (
        <EmptyCard
          title="لا توجد طلبات بعد"
          message="ستظهر طلباتك هنا بعد إتمام الشراء."
          action={<PrimaryButton label="ابدأ التسوق" onPress={() => router.push("/search")} />}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  trackerCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  orderVendor: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
    textAlign: "right",
  },
  badgeStack: {
    gap: theme.spacing[8],
  },
});
