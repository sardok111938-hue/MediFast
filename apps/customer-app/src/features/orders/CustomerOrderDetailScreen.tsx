import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { formatOrderNumber } from "@medifast/types";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import {
  Card,
  DetailRow,
  EmptyCard,
  ErrorCard,
  HelperText,
  LoadingCard,
  PrimaryButton,
  Screen,
  SectionTitle,
  StatusBadge,
} from "../../components/CustomerUI";
import {
  customerOrderTimeline,
  formatCustomerCurrency,
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  getDeliveryHeadline,
  getTimelineStepState,
  loadCurrentCustomerOrder,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "./customer-orders";
import { subscribeToOrderTracking, supabase } from "../../lib/supabase";

export default function CustomerOrderDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [order, setOrder] = useState<CustomerOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError("معرّف الطلب غير موجود.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await loadCurrentCustomerOrder(orderId);
      setCustomerId(result.customerId);
      setOrder(result.order);
    } catch (nextError) {
      setOrder(null);
      setError(normalizeCustomerOrderError(nextError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  useEffect(() => {
    if (!customerId || !orderId) {
      return;
    }

    const channel = subscribeToOrderTracking(orderId, () => {
      void loadOrder();
    });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [customerId, loadOrder, orderId]);

const deliveryHeadline = order ? getDeliveryHeadline(order) : null;

const driverLabel = order?.driverName
  ? order.driverName
  : order?.driverPhone
    ? "تم تعيين السائق"
    : "لا يوجد سائق";

const handleCallDriver = useCallback(async () => {
    if (!order?.driverPhone) {
    return;
  }

  try {
    await Linking.openURL(`tel:${order.driverPhone}`);
  } catch {
    // ignore for now
  }
}, [order?.driverPhone]);
  return (
    <Screen
  title="تفاصيل الطلب"
  subtitle="تابع تقدم الطلب وحالة الدفع وتحديثات التوصيل بشكل مباشر."
  scroll={false}
  backHref="/(tabs)/orders"
  backLabel="العودة إلى الطلبات"
>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <LoadingCard message="جارٍ تحميل الطلب..." />
        ) : error ? (
          <ErrorCard message={error} onRetry={() => void loadOrder()} />
        ) : !order ? (
          <EmptyCard title="الطلب غير موجود" message="هذا الطلب غير متاح لحساب الزبون الحالي." />
        ) : (
          <>
<Card style={styles.statusCard}>
  <View style={styles.statusHeader}>
    <View style={styles.statusHeaderCopy}>
      <Text style={styles.vendorName}>{order.vendorName}</Text>

      <Text style={styles.orderNumber}>
        {`#${formatOrderNumber(order.id).toUpperCase()}`}
      </Text>
    </View>

    <View style={styles.badgeRow}>
      <StatusBadge
        label={formatOrderStatusLabel(order.orderStatus)}
        tone={orderStatusTone(order.orderStatus)}
      />

      <StatusBadge
        label={formatCustomerPaymentStatusLabel(
          order.paymentStatus,
          order.paymentMethod
        )}
        tone={orderStatusTone(order.paymentStatus)}
      />
    </View>
  </View>

  {deliveryHeadline ? (
    <HelperText tone={deliveryHeadline.tone}>
      {deliveryHeadline.message}
    </HelperText>
  ) : null}

  <View style={styles.compactMetaRow}>
    <Text style={styles.metaText}>
      {driverLabel}
    </Text>

    {order.driverVehicleType ? (
      <Text style={styles.metaText}>
        • {order.driverVehicleType}
      </Text>
    ) : null}
  </View>

  <Text style={styles.addressText} numberOfLines={2}>
    {order.deliveryAddress}
  </Text>

  {order.driverPhone ? (
    <PrimaryButton
      label="اتصال بالسائق"
      onPress={() => void handleCallDriver()}
    />
  ) : null}

</Card>
<Card>
  <SectionTitle label="ملخص الدفع" />

<View style={styles.itemHighlight}>
  {order.items.map((item) => (
    <Text key={item.id} style={styles.itemHighlightText}>
      {item.productName}
    </Text>
  ))}
</View>

<DetailRow
  label="تاريخ الطلب"
  value={formatCustomerDate(order.createdAt)}
/>

{order.deliveredAt ? (
  <DetailRow
    label="تاريخ التسليم"
    value={formatCustomerDate(order.deliveredAt)}
  />
  ) : null}


  <DetailRow
  label={`${order.items.length} ${
    order.items.length === 1 ? "منتج" : "منتجات"
  }`}
  value={formatCustomerCurrency(order.total - (order.deliveryFee ?? 0))}
/>

  <DetailRow
    label="التوصيل"
    value={formatCustomerCurrency(order.deliveryFee ?? 0)}
  />

  <DetailRow
    label="الإجمالي"
    value={formatCustomerCurrency(order.total)}
  />

  <DetailRow
    label="الدفع"
    value="عند الاستلام"
  />
</Card>
<PrimaryButton label="العودة للبحث" variant="secondary" onPress={() => router.push("/search")} />
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
  statusCard: {
    backgroundColor: "#E8F7EE",
    borderColor: "#D0E9D9",
  },
  orderNumber: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  vendorName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.lg,
    textAlign: "right",
  },
  badgeStack: {
    gap: theme.spacing[8],
  },
  timelineRow: {
    flexDirection: "row-reverse",
    gap: theme.spacing[12],
    minHeight: 64,
  },
  timelineRail: {
    alignItems: "center",
    width: 20,
  },
  timelineDot: {
    width: 14,
    height: 14,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  timelineDotCompleted: {
    borderColor: theme.colors.success,
    backgroundColor: theme.colors.success,
  },
  timelineDotCurrent: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  timelineLine: {
    flex: 1,
    width: 2,
    backgroundColor: theme.colors.border,
    marginTop: 4,
  },
  timelineLineCompleted: {
    backgroundColor: theme.colors.success,
  },
  timelineCopy: {
    flex: 1,
    gap: 4,
    paddingBottom: theme.spacing[8],
  },
  timelineLabel: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
  timelineLabelUpcoming: {
    color: theme.colors.muted,
  },
  timelineHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    textAlign: "right",
  },
  itemCard: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    padding: theme.spacing[16],
    gap: theme.spacing[8],
    backgroundColor: theme.colors.background,
  },
  itemTitle: {
    fontWeight: "800",
    fontSize: theme.typography.body.lg,
    color: theme.colors.text,
    textAlign: "right",
  },
  driverSection: {
  gap: theme.spacing[12],
},
statusDivider: {
  height: 1,
  backgroundColor: "#D0E9D9",
  marginVertical: theme.spacing[16],
},
statusHeader: {
  flexDirection: "row-reverse",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: theme.spacing[12],
},

statusHeaderCopy: {
  flex: 1,
  gap: 2,
},

badgeRow: {
  gap: theme.spacing[8],
  alignItems: "flex-end",
},

compactMetaRow: {
  flexDirection: "row-reverse",
  flexWrap: "wrap",
  gap: theme.spacing[8],
},
addressText: {
  color: theme.colors.text,
  textAlign: "right",
  lineHeight: 20,
},
orderItemSummary: {
  alignSelf: "stretch",
  gap: 4,
},

metaText: {
  color: theme.colors.muted,
  fontSize: theme.typography.caption.md,
  textAlign: "right",
  alignSelf: "stretch",
},
itemHighlight: {
  backgroundColor: "#FFF7ED",
  borderRadius: 10,
  paddingHorizontal: theme.spacing[12],
  paddingVertical: theme.spacing[8],
  alignSelf: "stretch",
  gap: 4,
},
itemHighlightText: {
  color: "#C2410C",
  fontSize: theme.typography.body.sm,
  fontWeight: "800",
  textAlign: "right",
},
});
