import { Badge } from "../../../components/ui/badge";
import { formatOrderStatusLabel } from "@medifast/i18n";

export function OrderStatusBadge({ status }: { status: string }) {
  const normalizedStatus = status === "driver_assigned" ? "assigned" : status;
  const className =
    normalizedStatus === "placed"
      ? "status-placed"
      : normalizedStatus === "pending"
        ? "status-pending"
      : normalizedStatus === "accepted"
        ? "status-accepted"
        : normalizedStatus === "preparing"
          ? "status-preparing"
        : normalizedStatus === "ready_for_pickup"
          ? "status-ready"
          : normalizedStatus === "assigned"
            ? "status-assigned"
            : normalizedStatus === "on_the_way"
              ? "status-on-the-way"
              : normalizedStatus === "delivered"
                ? "status-delivered"
                : normalizedStatus === "cancelled"
                  ? "status-cancelled"
                : normalizedStatus === "rejected"
                  ? "status-rejected"
                  : "";

  return <Badge className={className}>{formatOrderStatusLabel(normalizedStatus)}</Badge>;
}
