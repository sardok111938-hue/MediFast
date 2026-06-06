import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  DriverButton,
  DriverCard,
  DriverErrorCard,
  DriverLoadingCard,
  DriverScreen,
} from "../../../src/components/DriverUI";

import {
  formatCurrency,
  formatDate,
  getCurrentDriverProfile,
  getStatusLabel,
  listDeliveredDriverOrders,
  normalizeError,
  type DriverOrder,
} from "../../../src/lib/driver-data";

function shortOrderRef(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export default function DriverHistoryScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState<DriverOrder[]>([]);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const profile = await getCurrentDriverProfile();
      const deliveredOrders = await listDeliveredDriverOrders(profile.driverId);
      setOrders(deliveredOrders);
    } catch (nextError) {
      setError(normalizeError(nextError));
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  return (
    <DriverScreen title="سجل التوصيلات" scroll={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void loadHistory(true)} />
        }
      >
        {loading ? (
          <DriverLoadingCard message="جارٍ تحميل السجل..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadHistory(true)} />
        ) : orders.length === 0 ? (
          <DriverCard>
            <Text style={styles.emptyTitle}>لا توجد توصيلات سابقة</Text>
            <Text style={styles.emptyText}>ستظهر الطلبات المسلّمة هنا.</Text>
          </DriverCard>
        ) : (
          orders.map((order) => {
            const isExpanded = expandedOrderId === order.id;

            return (
              <DriverCard key={order.id}>
                <Pressable
                  onPress={() => setExpandedOrderId(isExpanded ? null : order.id)}
                  style={styles.summaryRow}
                >
                  <View style={styles.summaryText}>
                    <Text style={styles.orderRef}>طلب {shortOrderRef(order.id)}</Text>
                    <Text style={styles.metaText}>{formatDate(order.createdAt)}</Text>
                  </View>

                  <View style={styles.summaryAmount}>
                    <Text style={styles.amount}>{formatCurrency(order.deliveryPayout ?? 0)}</Text>
                    <Text style={styles.chevron}>{isExpanded ? "▲" : "▼"}</Text>
                  </View>
                </Pressable>

                {isExpanded ? (
                  <View style={styles.details}>
                    <Text style={styles.detailLine}>الحالة: {getStatusLabel(order.orderStatus)}</Text>
                    <Text style={styles.detailLine}>الصيدلية: {order.vendorName}</Text>
                    <Text style={styles.detailLine}>العميل: {order.customerName}</Text>
                    <Text style={styles.detailLine}>الاستلام: {order.pickupAddress}</Text>
                    <Text style={styles.detailLine}>التسليم: {order.dropoffAddress}</Text>

                    <DriverButton
                      label="عرض التفاصيل"
                      onPress={() =>
                        router.push({
                          pathname: "/(tabs)/orders/[orderId]",
                          params: { orderId: order.id },
                        })
                      }
                    />
                  </View>
                ) : null}
              </DriverCard>
            );
          })
        )}
      </ScrollView>
    </DriverScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  summaryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  summaryText: {
    flex: 1,
    alignItems: "flex-end",
    gap: 4,
  },
  orderRef: {
    fontSize: 15,
    fontWeight: "900",
    color: "#18251F",
    textAlign: "right",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B756F",
    textAlign: "right",
  },
  summaryAmount: {
    alignItems: "flex-start",
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#12805C",
  },
  chevron: {
    fontSize: 12,
    fontWeight: "900",
    color: "#6B756F",
  },
  details: {
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF1EF",
    paddingTop: 12,
  },
  detailLine: {
    fontSize: 13,
    fontWeight: "700",
    color: "#39443E",
    textAlign: "right",
    lineHeight: 19,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#18251F",
    textAlign: "center",
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B756F",
    textAlign: "center",
  },
});