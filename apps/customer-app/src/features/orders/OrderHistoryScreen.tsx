import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useFocusEffect } from "expo-router";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, ErrorCard, HelperText, ListCard, LoadingCard, PrimaryButton, Screen, SectionTitle, StatusBadge } from "../../components/CustomerUI";
import {
  isActiveCustomerOrder,
  loadCurrentCustomerOrders,
  formatCustomerCurrency,
  formatCustomerDate,
  formatCustomerPaymentStatusLabel,
  formatOrderStatusLabel,
  normalizeCustomerOrderError,
  orderStatusTone,
  type CustomerOrder,
} from "./customer-orders";
import {
  listCurrentCustomerPrescriptionRequests,
  respondToPrescriptionQuote,
  type CustomerPrescriptionQuote,
  type CustomerPrescriptionQuoteItem,
  type CustomerPrescriptionRequest,
  createOrderFromQuote,
} from "../../lib/prescription-requests";
import {
  subscribeToCustomerOrders,
  subscribeToCustomerPrescriptionRequests,
  supabase,
} from "../../lib/supabase";

function formatPrescriptionStatusLabel(status: CustomerPrescriptionRequest["status"]) {
  switch (status) {
    case "pending":
      return "قيد المراجعة";
    case "accepted":
      return "مقبولة";
    case "rejected":
      return "مرفوضة";
    case "cancelled":
      return "ملغاة";
    default:
      return status;
  }
}

function formatQuoteStatusLabel(status: CustomerPrescriptionQuote["status"]) {
  switch (status) {
    case "draft":
      return "قيد التجهيز";
    case "sent":
      return "بانتظار ردك";
    case "accepted":
      return "تم قبول العرض";
    case "rejected":
      return "تم رفض العرض";
    case "expired":
      return "انتهى العرض";
    default:
      return status;
  }
}

function formatAvailabilityLabel(status: CustomerPrescriptionQuoteItem["availabilityStatus"]) {
  switch (status) {
    case "available":
      return "متوفر";
    case "unavailable":
      return "غير متوفر";
    case "substitute":
      return "بديل";
    default:
      return status;
  }
}

export default function OrderHistoryScreen() {
  const router = useRouter();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [prescriptions, setPrescriptions] = useState<CustomerPrescriptionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [respondingQuoteId, setRespondingQuoteId] = useState<string | null>(null);
  const [creatingOrderQuoteId, setCreatingOrderQuoteId] = useState<string | null>(null);
  const [quoteMessage, setQuoteMessage] = useState<string | null>(null);

const activeOrders = useMemo(
  () =>
    orders.filter(
      (order) =>
        order.orderStatus !== "delivered" &&
        order.orderStatus !== "cancelled" &&
        order.orderStatus !== "rejected"
    ),
  [orders]
);

const archivedOrders = useMemo(
  () =>
    orders.filter(
      (order) =>
        order.orderStatus === "delivered" ||
        order.orderStatus === "cancelled" ||
        order.orderStatus === "rejected"
    ),
  [orders]
);

const visiblePrescriptions = useMemo(
  () =>
    prescriptions.filter(
      (prescription) => !prescription.quote?.convertedOrderId
    ),
  [prescriptions]
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
      const [result, prescriptionRequests] = await Promise.all([
        loadCurrentCustomerOrders(),
        listCurrentCustomerPrescriptionRequests(),
      ]);

      setCustomerId(result.customerId);
      setOrders(result.orders);
      setPrescriptions(prescriptionRequests);
    } catch (nextError) {
      setOrders([]);
      setPrescriptions([]);
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

    const ordersChannel = subscribeToCustomerOrders(customerId, () => {
      void loadOrders("refresh");
    });
    const prescriptionsChannel = subscribeToCustomerPrescriptionRequests(customerId, () => {
      void loadOrders("refresh");
    });

    return () => {
      void supabase.removeChannel(ordersChannel);
      void supabase.removeChannel(prescriptionsChannel);
    };
  }, [customerId, loadOrders]);

  async function handleQuoteResponse(quoteId: string, response: "accepted" | "rejected") {
    setRespondingQuoteId(quoteId);
    setQuoteMessage(null);

    try {
      await respondToPrescriptionQuote({ quoteId, response });
      setQuoteMessage(
        response === "accepted"
          ? "تم قبول العرض. سيتم لاحقاً تحويله إلى طلب دفع عند الاستلام."
          : "تم رفض العرض."
      );
      await loadOrders("refresh");
    } catch (nextError) {
      setQuoteMessage(normalizeCustomerOrderError(nextError));
    } finally {
      setRespondingQuoteId(null);
    }
  }

  async function handleCreateOrderFromQuote(quoteId: string) {
      if (creatingOrderQuoteId !== null) {
        return;
      }

  setCreatingOrderQuoteId(quoteId);
  setQuoteMessage(null);


  try {
    const result = await createOrderFromQuote(quoteId);

    if (!result.orderId) {
      throw new Error("تعذر إنشاء الطلب.");
    }

    setQuoteMessage("تم إنشاء الطلب بنجاح.");

    await loadOrders("refresh");

    router.push({
      pathname: "/orders/[orderId]",
      params: {
        orderId: result.orderId,
      },
    });
  } catch (nextError) {
    setQuoteMessage(normalizeCustomerOrderError(nextError));
  } finally {
    setCreatingOrderQuoteId(null);
  }
}

  return (
<Screen title="" subtitle="">
<View style={styles.floatingHeader}>
</View>
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
        ) : orders.length === 0 && prescriptions.length === 0 ? (
          <EmptyCard
            title="لا توجد طلبات بعد"
            message="ستظهر طلباتك هنا بعد إتمام أول عملية شراء."
            action={<PrimaryButton label="ابدأ التسوق" onPress={() => router.push("/(tabs)/search")} />}
          />
        ) : (
          <>
            {visiblePrescriptions.length > 0 ? (
              <>
                <SectionTitle label="الطلبات والوصفات" />
                {visiblePrescriptions.map((prescription) => (
                  <ListCard
                    key={prescription.id}
                    title="طلب وصفة طبية"
                    subtitle={prescription.vendorName}
                    badge={
                      <StatusBadge
                        label={formatPrescriptionStatusLabel(prescription.status)}
                        tone={orderStatusTone(prescription.status)}
                      />
                    }
                  >
                    {prescription.vendorNote && !prescription.quote?.convertedOrderId ? (
                      <View style={styles.prescriptionReply}>
                        <Text style={styles.prescriptionReplyLabel}>رد الصيدلية</Text>
                        <Text style={styles.prescriptionReplyText}>{prescription.vendorNote}</Text>
                      </View>
                    ) : (
                      <HelperText>
                        ستظهر رسالة الصيدلية هنا بعد مراجعة الوصفة.
                      </HelperText>
                    )}

                    {prescription.note ? (
                      <Text style={styles.metaText}>ملاحظتك: {prescription.note}</Text>
                    ) : null}

                    {prescription.quote ? (
                      <View style={styles.quoteBox}>
                        <View style={styles.quoteHeader}>
                          <StatusBadge
                            label={formatQuoteStatusLabel(prescription.quote.status)}
                            tone={orderStatusTone(prescription.quote.status)}
                          />
                          <Text style={styles.quoteTitle}>عرض السعر</Text>
                        </View>

                        {prescription.quote.vendorNote ? (
                          <Text style={styles.metaText}>
                            ملاحظة العرض: {prescription.quote.vendorNote}
                          </Text>
                        ) : null}

                        <View style={styles.quoteItems}>
                          {prescription.quote.items.map((item) => (
                            <View
                              key={item.id}
                              style={[
                                styles.quoteItem,
                                item.availabilityStatus === "unavailable" ? styles.quoteItemUnavailable : null,
                              ]}
                            >
                              <View style={styles.quoteItemHeader}>
  <Text style={styles.quoteItemName}>
    {item.productName}
  </Text>

  <View
    style={[
      styles.availabilityBadge,
      item.availabilityStatus === "available"
        ? styles.availableBadge
        : item.availabilityStatus === "substitute"
        ? styles.substituteBadge
        : styles.unavailableBadge,
    ]}
  >
    <Text style={styles.availabilityBadgeText}>
      {formatAvailabilityLabel(item.availabilityStatus)}
    </Text>
  </View>
</View>

<Text style={styles.quoteItemMeta}>
  الكمية {item.quantity} · {formatCustomerCurrency(item.unitPrice)}
</Text>
                              {item.note ? <Text style={styles.metaText}>{item.note}</Text> : null}
                              <Text style={styles.quoteItemTotal}>
                                {formatCustomerCurrency(item.lineTotal)}
                              </Text>
                            </View>
                          ))}
                        </View>

                        <View style={styles.quoteSubtotalRow}>
                          <Text style={styles.quoteSubtotalLabel}>الإجمالي الفرعي</Text>
                          <Text style={styles.quoteSubtotalValue}>
                            {formatCustomerCurrency(prescription.quote.subtotal)}
                          </Text>
                        </View>

                        {prescription.quote.status === "sent" ? (
                          <View style={styles.quoteActions}>
                            <PrimaryButton
                              label={respondingQuoteId === prescription.quote.id ? "جارٍ القبول..." : "قبول العرض"}
                              onPress={() => void handleQuoteResponse(prescription.quote!.id, "accepted")}
                              disabled={respondingQuoteId !== null}
                            />
                            <PrimaryButton
                              label={respondingQuoteId === prescription.quote.id ? "جارٍ الرفض..." : "رفض العرض"}
                              variant="secondary"
                              onPress={() => void handleQuoteResponse(prescription.quote!.id, "rejected")}
                              disabled={respondingQuoteId !== null}
                            />
                          </View>
                        ) : null}

{prescription.quote.status === "accepted" ? (
  <View style={styles.quoteActions}>
    {prescription.quote.convertedOrderId ? (
      <>
        <HelperText tone="success">
          تم إنشاء الطلب من عرض السعر.
        </HelperText>

        <PrimaryButton
          label="عرض الطلب"
          variant="secondary"
          onPress={() =>
            router.push({
              pathname: "/orders/[orderId]",
              params: {
                orderId: prescription.quote!.convertedOrderId!,
              },
            })
          }
        />
      </>
    ) : (
      <>
        <HelperText tone="success">
          تم قبول العرض. يمكنك الآن تأكيد الطلب والدفع عند الاستلام.
        </HelperText>

        <PrimaryButton
          label={
            creatingOrderQuoteId === prescription.quote.id
              ? "جارٍ إنشاء الطلب..."
              : "تأكيد الطلب"
          }
          onPress={() =>
            void handleCreateOrderFromQuote(prescription.quote!.id)
          }
          disabled={
            creatingOrderQuoteId !== null ||
            prescription.quote.status !== "accepted"
          }
        />
      </>
    )}
  </View>
) : null}</View>
) : null}

{quoteMessage ? (
  <HelperText
    tone={quoteMessage.includes("تعذر") ? "danger" : "success"}
  >
    {quoteMessage}
  </HelperText>
) : null}

<Text style={styles.metaText}>
  {formatCustomerDate(prescription.createdAt)}
</Text>
                  </ListCard>
                ))}

              </>
            ) : null}

{activeOrders.map((order) => (
  <ListCard
    key={order.id}
    title={order.vendorName}
    subtitle={`${formatOrderStatusLabel(order.orderStatus)} · ${formatCustomerCurrency(order.total)}`}
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
  >
    <PrimaryButton
      label="تتبع الطلب"
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
            {archivedOrders.length > 0 ? (
  <SectionTitle label="السجل السابق" />
) : null}

{archivedOrders.map((order) => (
  <ListCard
    key={order.id}
    title={order.vendorName}
    subtitle={`${formatCustomerDate(order.createdAt)} · ${formatCustomerCurrency(order.total)}`}
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
  prescriptionReply: {
    borderRadius: 18,
    backgroundColor: "#F3FAF6",
    borderWidth: 1,
    borderColor: "#D8ECDD",
    padding: theme.spacing[12],
    gap: 6,
  },
  prescriptionReplyLabel: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "right",
  },
  prescriptionReplyText: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "right",
  },
  quoteBox: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D8ECDD",
    backgroundColor: "#FFFFFF",
    padding: theme.spacing[12],
    gap: theme.spacing[12],
  },
  quoteHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  quoteTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  quoteItems: {
    gap: theme.spacing[8],
  },
  quoteItem: {
    borderRadius: 16,
    backgroundColor: "#F7FAF8",
    padding: theme.spacing[12],
    gap: 5,
  },
  quoteItemUnavailable: {
    backgroundColor: "#FFF6F6",
    borderWidth: 1,
    borderColor: "#F3CACA",
  },
  quoteItemName: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
    textAlign: "right",
  },
  quoteItemMeta: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
  },
  quoteItemTotal: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
    textAlign: "right",
  },
  quoteSubtotalRow: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[12],
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing[12],
  },
  quoteSubtotalLabel: {
    color: theme.colors.text,
    fontWeight: "900",
  },
  quoteSubtotalValue: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
  },
  quoteActions: {
    gap: theme.spacing[8],
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
    textAlign: "right",
  },
  acceptedMessage: {
  color: "#166534",
  fontSize: theme.typography.body.sm,
  fontWeight: "800",
  textAlign: "right",
},

rejectedMessage: {
  color: "#B42318",
  fontSize: theme.typography.body.sm,
  fontWeight: "800",
  textAlign: "right",
},
quoteItemHeader: {
  flexDirection: "row-reverse",
  justifyContent: "space-between",
  alignItems: "center",
  gap: theme.spacing[8],
},

availabilityBadge: {
  borderRadius: 999,
  paddingHorizontal: 10,
  paddingVertical: 4,
},

availableBadge: {
  backgroundColor: "#ECFDF3",
},

substituteBadge: {
  backgroundColor: "#FFF7ED",
},

unavailableBadge: {
  backgroundColor: "#FEF3F2",
},

availabilityBadgeText: {
  fontSize: theme.typography.caption.sm,
  fontWeight: "800",
  textAlign: "center",
},
floatingHeader: {
  flexDirection: "row-reverse",
  alignItems: "center",
  paddingHorizontal: theme.spacing[20],
  paddingTop: theme.spacing[12],
  paddingBottom: theme.spacing[8],
  top: theme.spacing[12],
  left: theme.spacing[12],
  right: theme.spacing[12],
  position: "absolute",
  zIndex: 20,
},

headerCopy: {
  flex: 1,
  alignItems: "flex-end",
  gap: 2,
  marginRight: theme.spacing[12],
},

headerTitle: {
  color: theme.colors.text,
  fontSize: theme.typography.heading.lg,
  fontWeight: "900",
  textAlign: "right",
},

headerSubtitle: {
  color: theme.colors.muted,
  fontSize: theme.typography.caption.md,
  fontWeight: "700",
  textAlign: "right",
},
screenContent: {
  gap: theme.spacing[16],
  paddingBottom: 120,
},
});
