import { theme } from "@medifast/ui";
import { StyleSheet, Text, View } from "react-native";

import {
  DriverButton,
  DriverEmptyCard,
  DriverSectionTitle,
  shortOrderRef,
} from "../shared/DriverPrimitives";
import {
  getStatusLabel,
  statusTone,
  type DriverOrder,
} from "../../lib/driver-data";
import { DriverOrderCard } from "./DriverOrderCard";
import { DriverOrderFooter } from "./DriverOrderFooter";
import { DriverOrderUtilities } from "./DriverOrderUtilities";

type DriverOrdersSectionProps = {
  title: string;
  hint: string;
  count: number;
  emptyTitle: string;
  emptyMessage: string;
  orders: DriverOrder[];
  mode: "available" | "current" | "history";
  showNearestBadge?: boolean;
  claimingOrderId?: string | null;
  onClaimOrder?: (orderId: string) => void;
  onOpenOrder?: (orderId: string) => void;
};

export function DriverOrdersSection({
  title,
  hint,
  count,
  emptyTitle,
  emptyMessage,
  orders,
  mode,
  showNearestBadge,
  claimingOrderId,
  onClaimOrder,
  onOpenOrder,
}: DriverOrdersSectionProps) {
  return (
    <>
      <View style={styles.sectionBlock}>
        <View style={styles.sectionHeaderRow}>
          <DriverSectionTitle>{title}</DriverSectionTitle>
          <Text style={styles.sectionCount}>{count}</Text>
        </View>

        {hint ? <Text style={styles.sectionHint}>{hint}</Text> : null}
      </View>

      {orders.length === 0 ? (
        <DriverEmptyCard title={emptyTitle} message={emptyMessage} />
      ) : (
        orders.map((order, index) => (
          <View
            key={mode === "available" ? `available-${order.id}` : order.id}
            style={styles.orderWrap}
          >
            <DriverOrderCard
              vendorName={order.vendorName}
              customerName={
                mode === "available"
                  ? "مخفية حتى قبول الطلب"
                  : order.customerName
              }
              distanceKm={mode === "current" ? order.estimatedDistanceKm : null}
              orderRef={`طلب ${shortOrderRef(order.id)}`}
              statusLabel={getStatusLabel(order.orderStatus)}
              statusTone={statusTone(order.orderStatus)}
              pickupAddress={order.pickupAddress}
              dropoffAddress={
                mode === "available"
                  ? "تظهر بعد قبول الطلب"
                  : order.dropoffAddress
              }
              action={
                mode === "available" ? (
                  <DriverButton
                    label={
                      claimingOrderId === order.id
                        ? "جارٍ القبول..."
                        : "قبول الطلب"
                    }
                    onPress={() => onClaimOrder?.(order.id)}
                    disabled={Boolean(claimingOrderId)}
                    size="sm"
                  />
                ) : (
                  <DriverButton
                    label="عرض التفاصيل"
                    size="sm"
                    onPress={() => onOpenOrder?.(order.id)}
                  />
                )
              }
              utilities={
                mode === "available" ? undefined : (
                  <DriverOrderUtilities order={order} mapTarget="dropoff" />
                )
              }
              footer={
                <DriverOrderFooter
                  order={order}
                  showTotal={mode === "available"}
                />
              }
              compact
            />
          </View>
        ))
      )}
    </>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: 2,
    marginTop: theme.spacing[4],
  },
  sectionHeaderRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  sectionCount: {
    minWidth: 30,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "#EEF7F2",
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    lineHeight: 18,
    paddingHorizontal: theme.spacing[8],
    paddingVertical: 3,
    textAlign: "center",
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    lineHeight: 18,
    textAlign: "right",
    fontWeight: "600",
  },
  orderWrap: {
    gap: theme.spacing[8],
  },
});
