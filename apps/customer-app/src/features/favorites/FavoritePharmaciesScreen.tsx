import { Ionicons } from "@expo/vector-icons";
import { theme } from "@medifast/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CatalogImage } from "../../components/CatalogImage";
import {
  EmptyCard,
  ErrorCard,
  LoadingCard,
  PrimaryButton,
  Screen,
  SectionTitle,
} from "../../components/CustomerUI";
import {
  calculateDistanceKm,
  formatDistanceKm,
  getPrimaryAddress,
  isVendorWithinDeliveryRadius,
  useCustomerCatalogData,
} from "../../lib/customer-catalog";
import {
  listCustomerFavoriteVendorIds,
  toggleCustomerFavoriteVendor,
} from "./vendor-favorites";

export default function FavoritePharmaciesScreen() {
  const router = useRouter();
  const { data: catalog, loading, error, reload } = useCustomerCatalogData();

  const [favoriteVendorIds, setFavoriteVendorIds] = useState<string[]>([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);

  const primaryAddress = getPrimaryAddress(catalog.addresses, catalog.defaultAddressId);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadFavorites() {
        setFavoritesLoading(true);

        try {
          const ids = await listCustomerFavoriteVendorIds();

          if (mounted) {
            setFavoriteVendorIds(ids);
          }
        } catch (error) {
          console.log("LOAD_FAVORITE_PHARMACIES_ERROR", error);
        } finally {
          if (mounted) {
            setFavoritesLoading(false);
          }
        }
      }

      void loadFavorites();

      return () => {
        mounted = false;
      };
    }, []),
  );

  const favoriteVendors = useMemo(() => {
    return catalog.vendors
      .filter((vendor) => favoriteVendorIds.includes(vendor.id))
      .sort((a, b) => {
        const distanceA = calculateDistanceKm(primaryAddress, a);
        const distanceB = calculateDistanceKm(primaryAddress, b);

        const aWithinRadius = isVendorWithinDeliveryRadius(primaryAddress, a);
        const bWithinRadius = isVendorWithinDeliveryRadius(primaryAddress, b);

        if (aWithinRadius !== bWithinRadius) {
          return aWithinRadius ? -1 : 1;
        }

        if (a.is_open !== b.is_open) {
          return a.is_open ? -1 : 1;
        }

        if (distanceA === null) return 1;
        if (distanceB === null) return -1;

        return distanceA - distanceB;
      });
  }, [catalog.vendors, favoriteVendorIds, primaryAddress]);

  async function handleRemoveFavorite(vendorId: string) {
    try {
      const result = await toggleCustomerFavoriteVendor(vendorId);
      setFavoriteVendorIds(result.favoriteVendorIds);
    } catch (error) {
      console.log("REMOVE_FAVORITE_PHARMACY_ERROR", error);
    }
  }

  return (
    <Screen
      title="صيدلياتي المفضلة"
      subtitle="الصيدليات التي تحفظها للطلب السريع."
      backHref="/(tabs)/profile"
      backLabel="العودة إلى الحساب"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {loading || favoritesLoading ? <LoadingCard message="جارٍ تحميل الصيدليات المفضلة..." /> : null}

      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      {!loading && !favoritesLoading && !error && favoriteVendors.length === 0 ? (
        <EmptyCard
          title="لا توجد صيدليات مفضلة"
          message="اضغط على رمز القلب في بطاقة الصيدلية لحفظها هنا."
          action={
            <PrimaryButton
              label="تصفح الصيدليات"
              onPress={() => router.push("/(tabs)/home")}
            />
          }
        />
      ) : null}

      {!loading && !favoritesLoading && !error && favoriteVendors.length > 0 ? (
        <View style={styles.sectionBlock}>
          <SectionTitle label="الصيدليات المحفوظة" />

          <View style={styles.list}>
            {favoriteVendors.map((vendor) => {
              const distanceKm = calculateDistanceKm(primaryAddress, vendor);
              const withinRadius = isVendorWithinDeliveryRadius(primaryAddress, vendor);

              return (
                <Pressable
                  key={vendor.id}
                  style={[
                    styles.card,
                    !withinRadius || !vendor.is_open ? styles.cardMuted : null,
                  ]}
                  disabled={!withinRadius}
                  onPress={() =>
                    router.push({
                      pathname: "/pharmacies/[pharmacyId]",
                      params: { pharmacyId: vendor.id },
                    })
                  }
                >
                  <View style={styles.imageShell}>
                    <CatalogImage
                      uri={vendor.image_url}
                      alt={vendor.name}
                      fallbackLabel="صيدلية"
                      containerStyle={[
                        styles.imageWrap,
                        !withinRadius || !vendor.is_open ? styles.imageMuted : null,
                      ]}
                      imageStyle={styles.image}
                    />

                    <Pressable
                      hitSlop={10}
                      style={styles.removeButton}
                      onPress={(event) => {
                        event.stopPropagation();
                        void handleRemoveFavorite(vendor.id);
                      }}
                    >
                      <Ionicons name="heart" size={19} color="#E53935" />
                    </Pressable>
                  </View>

                  <View style={styles.cardBody}>
                    <View style={styles.titleRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {vendor.name}
                      </Text>

                      <View style={[styles.statusPill, !vendor.is_open ? styles.statusPillClosed : null]}>
                        <Text style={[styles.statusText, !vendor.is_open ? styles.statusTextClosed : null]}>
                          {vendor.is_open ? "مفتوح الآن" : "مغلق الآن"}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.address} numberOfLines={1}>
                      {vendor.address || "صيدلية معتمدة"}
                    </Text>

                    <View style={styles.metaRow}>
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={theme.colors.muted} />
                        <Text style={styles.metaText}>
                          {distanceKm !== null ? formatDistanceKm(distanceKm) : "—"}
                        </Text>
                      </View>

                      <View style={styles.metaItem}>
                        <Ionicons name="cube-outline" size={14} color={theme.colors.muted} />
                        <Text style={styles.metaText}>
                          {withinRadius ? "ضمن نطاق التوصيل" : "خارج نطاق التوصيل"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionBlock: {
    gap: theme.spacing[12],
  },
  list: {
    gap: theme.spacing[12],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[12],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardMuted: {
    opacity: 0.78,
  },
  imageShell: {
    position: "relative",
    width: 92,
    height: 82,
    borderRadius: 18,
    overflow: "hidden",
  },
  imageWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 18,
    backgroundColor: "#F7FAF8",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imageMuted: {
    opacity: 0.55,
  },
  removeButton: {
    position: "absolute",
    top: 7,
    left: 7,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.96)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    gap: 7,
  },
  titleRow: {
    width: "100%",
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  address: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    backgroundColor: "#E4F4EA",
    borderWidth: 1,
    borderColor: "#CDEBDD",
  },
  statusPillClosed: {
    backgroundColor: "#FDECEC",
    borderColor: "#F5CACA",
  },
  statusText: {
    color: "#127244",
    fontSize: theme.typography.caption.sm,
    fontWeight: "900",
  },
  statusTextClosed: {
    color: "#B42318",
  },
  metaRow: {
    width: "100%",
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  metaItem: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 5,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
  },
});
