import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import { DriverErrorCard, DriverLoadingCard, DriverOrderCard, DriverScreen, shortOrderRef } from "../../src/components/DriverUI";
import {
  DriverHomeDeliveryAction,
  DriverHomeMetrics,
  DriverHomeSectionHeader,
  DriverReadyStateCard,
  DriverStatusSummaryCard,
} from "../../src/components/home";
import { formatDate, getStatusLabel, listAvailablePickupOrders, listCurrentDriverOrders, normalizeError, statusTone, type DriverOrder } from "../../src/lib/driver-data";
import { useDriverSession } from "../../src/hooks/use-driver-session";

export default function DriverDashboardScreen() {
  const router = useRouter();
  const { driver, loading, error, refresh } = useDriverSession();
  const [summary, setSummary] = useState<{
    availablePickups: number;
    activeDeliveries: number;
    latestAssignedAt: string;
    nextDelivery: DriverOrder | null;
  }>({
    availablePickups: 0,
    activeDeliveries: 0,
    latestAssignedAt: "",
    nextDelivery: null,
  });
  const [countsLoading, setCountsLoading] = useState(false);

  async function loadDashboardCounts(driverId: string) {
    setCountsLoading(true);

    try {
      const [orders, availablePickups] = await Promise.all([
        listCurrentDriverOrders(driverId),
        listAvailablePickupOrders(),
      ]);

      setSummary({
        availablePickups: availablePickups.length,
        activeDeliveries: orders.filter((order) =>
          ["assigned", "picked_up", "on_the_way"].includes(order.orderStatus)
      ).length,
        latestAssignedAt: orders[0]?.createdAt ?? "",
        nextDelivery: orders[0] ?? null,
      });
    } finally {
      setCountsLoading(false);
    }
  }

  useEffect(() => {
    if (driver?.driverId) {
      void loadDashboardCounts(driver.driverId);
    }
  }, [driver?.driverId]);

  async function handleRefresh() {
    const nextDriver = await refresh();

    if (nextDriver?.driverId) {
      await loadDashboardCounts(nextDriver.driverId);
    }
  }

  const nextDelivery = summary.nextDelivery;
  const freshnessText = summary.latestAssignedAt ? `آخر توصيل ${formatDate(summary.latestAssignedAt)}` : "محدّث الآن";

  return (
<DriverScreen>
    {loading ? (
        <DriverLoadingCard message="جارٍ تحميل لوحة السائق..." />
      ) : error ? (
        <DriverErrorCard message={error} onRetry={() => void handleRefresh()} />
      ) : (
        <>
          <DriverStatusSummaryCard driver={driver} countsLoading={countsLoading} freshnessText={freshnessText} />

          <DriverHomeMetrics
            availablePickups={summary.availablePickups}
            activeDeliveries={summary.activeDeliveries}
            isAvailable={driver?.isAvailable}
            loading={countsLoading}
          />

          <DriverHomeSectionHeader hasDelivery={Boolean(nextDelivery)} onRefresh={() => void handleRefresh()} />

          {nextDelivery ? (
            <DriverOrderCard
              vendorName={nextDelivery.vendorName}
              customerName={nextDelivery.customerName}
              orderRef={`طلب ${shortOrderRef(nextDelivery.id)}`}
              statusLabel={getStatusLabel(nextDelivery.orderStatus)}
              statusTone={statusTone(nextDelivery.orderStatus)}
              pickupAddress={nextDelivery.pickupAddress}
              dropoffAddress={nextDelivery.dropoffAddress}
              action={
                <DriverHomeDeliveryAction
                  onPress={() =>
                    router.push({
                      pathname: "/(tabs)/orders/[orderId]",
                      params: { orderId: nextDelivery.id },
                    })
                  }
                />
              }
              compact
            />
          ) : (
            <DriverReadyStateCard availablePickups={summary.availablePickups} />
          )}
        </>
      )}
    </DriverScreen>
  );
}
