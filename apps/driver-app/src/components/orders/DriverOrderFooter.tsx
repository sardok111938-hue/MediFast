import { theme } from "@medifast/ui";
import { StyleSheet, Text } from "react-native";

import {
  formatCurrency,
  getPaymentStatusLabel,
  type DriverOrder,
} from "../../lib/driver-data";

export function DriverOrderFooter({
  order,
  showTotal = true,
}: {
  order: DriverOrder;
  showTotal?: boolean;
}) {
  if (!showTotal) {
    return null;
  }

  return (
    <>
      <Text style={styles.footerText}>
        {formatCurrency(order.total)}
      </Text>

      <Text style={styles.footerText}>
        {getPaymentStatusLabel(
          order.paymentStatus,
          order.paymentMethod,
        )}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  footerText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "600",
    lineHeight: 18,
  },
});