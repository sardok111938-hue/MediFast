import { useCallback, useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  DriverButton,
  DriverCard,
  DriverEmptyCard,
  DriverErrorCard,
  DriverHelper,
  DriverLoadingCard,
  DriverMetricBadge,
  DriverNoteCard,
  DriverOrderCard,
  DriverQuickAction,
  DriverRow,
  DriverScreen,
  DriverSectionTitle,
  DriverUtilityRow,
  shortOrderRef,
} from "../../../src/components/DriverUI";
import { useDriverI18n } from "../../../src/lib/i18n";
import { theme } from "@medifast/ui";
import {
  formatCurrency,
  formatDate,
  getCurrentDriverProfile,
  getDriverNextActions,
  getDriverOrderDetail,
  getPaymentStatusLabel,
  getStatusLabel,
  normalizeError,
  statusTone,
  updateDriverOrderStatus,
  type DriverOrder,
} from "../../../src/lib/driver-data";

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

function normalizePhoneForWhatsApp(phone?: string | null) {
  const normalized = normalizePhoneForTel(phone);

  if (!normalized) {
    return null;
  }

  if (normalized.startsWith("+")) {
    return normalized.replace(/[^\d]/g, "");
  }

  if (normalized.startsWith("0")) {
    return null;
  }

  return normalized.replace(/[^\d]/g, "");
}

function buildPhoneUrl(phone: string) {
  return `tel:${phone}`;
}

function buildWhatsAppUrl(phone: string) {
  return `https://wa.me/${phone}`;
}

async function openUrl(url: string) {
  const canOpen = await Linking.canOpenURL(url);

  if (!canOpen) {
    throw new Error("تعذر فتح الرابط على هذا الجهاز.");
  }

  await Linking.openURL(url);
}

function formatRouteDistance(order: DriverOrder) {
  return order.estimatedDistanceKm == null ? "غير متاحة" : `تقريبًا ${order.estimatedDistanceKm} كم`;
}

function formatRouteDuration(order: DriverOrder) {
  return order.estimatedTravelMinutes == null ? "غير متاح" : `تقريبًا ${order.estimatedTravelMinutes} د`;
}

function DetailFooter({ order }: { order: DriverOrder }) {
  return (
    <>
      <Text style={styles.footerText}>{formatCurrency(order.total)}</Text>
      <Text style={styles.footerText}>{getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)}</Text>
      <Text style={styles.footerText}>{formatDate(order.createdAt)}</Text>
    </>
  );
}

function DetailMetrics({ order }: { order: DriverOrder }) {
  return (
    <DriverUtilityRow>
      <DriverMetricBadge label="المسافة" value={formatRouteDistance(order)} tone={order.estimatedDistanceKm == null ? "warning" : "info"} />
      <DriverMetricBadge label="زمن الطريق" value={formatRouteDuration(order)} tone={order.estimatedTravelMinutes == null ? "warning" : "info"} />
      <DriverMetricBadge label="أجر التوصيل" value={order.deliveryPayout == null ? "غير محدد" : formatCurrency(order.deliveryPayout)} tone="success" />
      {order.codAmount != null ? <DriverMetricBadge label="تحصيل نقدي" value={formatCurrency(order.codAmount)} tone="warning" /> : null}
    </DriverUtilityRow>
  );
}

export default function DriverOrderDetailScreen() {
  const router = useRouter();
  const { isRTL } = useDriverI18n();
  const params = useLocalSearchParams<{ orderId?: string | string[] }>();
  const orderId = Array.isArray(params.orderId) ? params.orderId[0] : params.orderId;
  const [driverId, setDriverId] = useState<string | null>(null);
  const [order, setOrder] = useState<DriverOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError("رقم الطلب غير موجود.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const profile = await getCurrentDriverProfile();
      setDriverId(profile.driverId);
      setOrder(await getDriverOrderDetail(profile.driverId, orderId));
    } catch (nextError) {
      setOrder(null);
      setError(normalizeError(nextError));
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  async function openMap(input: { address: string; lat?: number | null; lng?: number | null }) {
    try {
      await openUrl(buildGoogleMapsUrl(input));
    } catch (nextError) {
      setFeedback({ type: "error", message: normalizeError(nextError) });
    }
  }

  async function openCustomerPhone() {
    const phone = normalizePhoneForTel(order?.customerPhone);

    if (!phone) {
      setFeedback({ type: "error", message: "رقم العميل غير متاح لهذا الطلب." });
      return;
    }

    try {
      await openUrl(buildPhoneUrl(phone));
    } catch (nextError) {
      setFeedback({ type: "error", message: normalizeError(nextError) });
    }
  }

  async function openCustomerWhatsApp() {
    const phone = normalizePhoneForWhatsApp(order?.customerPhone);

    if (!phone) {
      setFeedback({ type: "error", message: "رقم واتساب الدولي غير متاح لهذا الطلب." });
      return;
    }

    try {
      await openUrl(buildWhatsAppUrl(phone));
    } catch (nextError) {
      setFeedback({ type: "error", message: normalizeError(nextError) });
    }
  }

  async function copyDropoffAddress() {
    if (!order) {
      return;
    }

    try {
      await Clipboard.setStringAsync(order.dropoffAddress);
      setFeedback({ type: "success", message: "تم نسخ عنوان التسليم." });
    } catch (nextError) {
      setFeedback({ type: "error", message: normalizeError(nextError) });
    }
  }

  async function handleStatusUpdate(nextStatus: string) {
    if (!order || !driverId) {
      return;
    }

    const previousStatus = order.orderStatus;
    setUpdatingStatus(nextStatus);
    setFeedback(null);
    setOrder((current) => (current ? { ...current, orderStatus: nextStatus } : current));

    try {
      await updateDriverOrderStatus({
        driverId,
        orderId: order.id,
        nextStatus,
        currentStatus: previousStatus,
      });

      setFeedback({
        type: "success",
        message: `تم تحديث الطلب إلى ${getStatusLabel(nextStatus)}.`,
      });
      await loadOrder();
    } catch (nextError) {
      setOrder((current) => (current ? { ...current, orderStatus: previousStatus } : current));
      setFeedback({
        type: "error",
        message: normalizeError(nextError),
      });
    } finally {
      setUpdatingStatus(null);
    }
  }

  const actions = order ? getDriverNextActions(order.orderStatus) : [];
  const primaryAction = actions[0] ?? null;
  const canCallCustomer = Boolean(normalizePhoneForTel(order?.customerPhone));
  const canWhatsAppCustomer = Boolean(normalizePhoneForWhatsApp(order?.customerPhone));

  return (
    <DriverScreen title="تفاصيل الطلب" subtitle="المسار والمنتجات وخطوة التوصيل التالية." scroll={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.topAction}>
          <DriverButton
            label="العودة للطلبات"
            onPress={() => router.replace("/(tabs)/orders")}
            variant="ghost"
            size="sm"
          />
        </View>

        {feedback ? <DriverHelper tone={feedback.type === "error" ? "danger" : "success"}>{feedback.message}</DriverHelper> : null}

        {loading ? (
          <DriverLoadingCard message="جارٍ تحميل تفاصيل الطلب..." />
        ) : error ? (
          <DriverErrorCard message={error} onRetry={() => void loadOrder()} />
        ) : !order ? (
          <DriverEmptyCard title="الطلب غير متاح" message="هذا الطلب غير مسند لك أو لم يعد متاحًا." />
        ) : (
          <>
            <DriverOrderCard
              vendorName={order.vendorName}
              customerName={order.customerName}
              orderRef={`طلب ${shortOrderRef(order.id)}`}
              statusLabel={getStatusLabel(order.orderStatus)}
              statusTone={statusTone(order.orderStatus)}
              pickupAddress={order.pickupAddress}
              dropoffAddress={order.dropoffAddress}
              utilities={<DetailMetrics order={order} />}
              action={
                primaryAction ? (
                  <DriverButton
                    label={updatingStatus === primaryAction.nextStatus ? "جارٍ التحديث..." : primaryAction.label}
                    onPress={() => void handleStatusUpdate(primaryAction.nextStatus)}
                    disabled={Boolean(updatingStatus)}
                  />
                ) : null
              }
              footer={<DetailFooter order={order} />}
              compact={false}
            />

            <DriverCard compact>
              <DriverSectionTitle>أدوات التوصيل</DriverSectionTitle>
              <DriverUtilityRow>
                <DriverQuickAction label="اتصال بالعميل" onPress={() => void openCustomerPhone()} disabled={!canCallCustomer} tone="primary" />
                <DriverQuickAction label="واتساب" onPress={() => void openCustomerWhatsApp()} disabled={!canWhatsAppCustomer} />
                <DriverQuickAction label="نسخ العنوان" onPress={() => void copyDropoffAddress()} />
              </DriverUtilityRow>
            </DriverCard>

            <DriverCard compact>
              <View style={[styles.mapHeader, isRTL ? styles.rowReverse : null]}>
                <View style={styles.mapTitleBlock}>
                  <DriverSectionTitle>الملاحة</DriverSectionTitle>
                  <Text style={[styles.mapHint, isRTL ? styles.textRight : null]}>
                    افتح المسار في الخرائط عند التحرك للاستلام أو التسليم.
                  </Text>
                </View>
              </View>

              <DriverUtilityRow>
                <DriverQuickAction
                  label="خريطة الاستلام"
                  onPress={() => void openMap({ address: order.pickupAddress, lat: order.pickupLat, lng: order.pickupLng })}
                />
                <DriverQuickAction
                  label="خريطة التسليم"
                  onPress={() => void openMap({ address: order.dropoffAddress, lat: order.dropoffLat, lng: order.dropoffLng })}
                  tone="primary"
                />
              </DriverUtilityRow>
            </DriverCard>

            {order.pharmacyInstructions || order.deliveryNotes ? (
              <DriverCard compact>
                <DriverSectionTitle>ملاحظات التشغيل</DriverSectionTitle>
                {order.pharmacyInstructions ? <DriverNoteCard title="تعليمات الصيدلية">{order.pharmacyInstructions}</DriverNoteCard> : null}
                {order.deliveryNotes ? <DriverNoteCard title="ملاحظات العميل">{order.deliveryNotes}</DriverNoteCard> : null}
              </DriverCard>
            ) : null}

            <DriverCard compact>
              <DriverSectionTitle>المنتجات</DriverSectionTitle>

              {order.items.length === 0 ? (
                <DriverHelper>لا توجد منتجات مرتبطة بهذا الطلب.</DriverHelper>
              ) : (
                <View style={styles.itemsList}>
                  {order.items.map((item) => (
                    <View key={item.id} style={styles.itemCard}>
                      <View style={[styles.itemHeader, isRTL ? styles.rowReverse : null]}>
                        <Text style={[styles.itemTitle, isRTL ? styles.textRight : null]} numberOfLines={2}>
                          {item.productName}
                        </Text>
                        <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                      </View>

                      <View style={[styles.itemMeta, isRTL ? styles.rowReverse : null]}>
                        <Text style={styles.itemMetaText}>{formatCurrency(item.unitPrice)}</Text>
                        <Text style={styles.itemMetaTotal}>{formatCurrency(item.totalPrice)}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </DriverCard>

            <DriverCard compact>
              <DriverSectionTitle>معلومات الطلب</DriverSectionTitle>
              <DriverRow label="العميل" value={order.customerName} />
              <DriverRow label="الدفع" value={getPaymentStatusLabel(order.paymentStatus, order.paymentMethod)} valueTone="muted" />
              <DriverRow label="الإجمالي" value={formatCurrency(order.total)} />
              <DriverRow label="رسوم التوصيل" value={formatCurrency(order.deliveryFee)} valueTone="muted" />
              <DriverRow label="وقت الإنشاء" value={formatDate(order.createdAt)} valueTone="muted" />
              <DriverRow label="رقم الطلب" value={shortOrderRef(order.id)} valueTone="muted" />
            </DriverCard>

            {actions.length > 1 ? (
              <DriverCard compact>
                <DriverSectionTitle>إجراءات أخرى</DriverSectionTitle>
                {actions.slice(1).map((action) => (
                  <DriverButton
                    key={action.nextStatus}
                    label={updatingStatus === action.nextStatus ? "جارٍ التحديث..." : action.label}
                    onPress={() => void handleStatusUpdate(action.nextStatus)}
                    disabled={Boolean(updatingStatus)}
                    variant="secondary"
                  />
                ))}
              </DriverCard>
            ) : null}
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
  mapHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  mapTitleBlock: {
    flex: 1,
    minWidth: 0,
    gap: theme.spacing[4],
  },
  mapHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: 20,
  },
  itemsList: {
    gap: theme.spacing[8],
  },
  itemCard: {
    borderWidth: 1,
    borderColor: "#E5EEE9",
    borderRadius: theme.radius.lg,
    padding: theme.spacing[12],
    gap: theme.spacing[8],
    backgroundColor: "#F8FBF9",
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[12],
    alignItems: "flex-start",
  },
  itemTitle: {
    flex: 1,
    minWidth: 0,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
    lineHeight: 22,
    color: theme.colors.text,
  },
  itemQuantity: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
    lineHeight: 22,
  },
  itemMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    borderTopWidth: 1,
    borderTopColor: "#EAF1ED",
    paddingTop: theme.spacing[8],
  },
  itemMetaText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
  },
  itemMetaTotal: {
    color: theme.colors.text,
    fontSize: theme.typography.body.sm,
    fontWeight: "800",
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  textRight: {
    textAlign: "right",
  },
});
