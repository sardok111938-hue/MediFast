import { useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import type { Product, Vendor } from "@medifast/types";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View, Linking } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../../src/components/CustomerUI";
import { DEFAULT_DELIVERY_FEE_ESTIMATE } from "../../src/features/checkout/cod-checkout";
import {
  getPharmacyCategoryProductCount,
  getPharmacyParentCategoriesForProducts,
  getVendorById,
  isFavouriteVendor,
  toggleFavouriteVendor,
  useCustomerCatalogData,
  getCategoryTheme,
  buildPharmacyCategoryTree,
  calculateDistanceKm,
  formatDistanceKm,
  getPrimaryAddress,
  loadVendorProducts,
} from "../../src/lib/customer-catalog";

const dayLabels = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function formatOpeningTime(value?: string | null) {
  if (!value) return "";

  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText ?? 0);

  const suffix = hour >= 12 ? "م" : "ص";
  const displayHour = hour % 12 || 12;

  return `${displayHour}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function formatOpeningHours(hours?: Vendor["operating_hours"]) {
  if (!hours || hours.length === 0) {
    return "ساعات العمل غير متاحة";
  }

  return [...hours]
    .sort((left, right) => left.day_of_week - right.day_of_week)
    .map((hour) => {
      const day = dayLabels[hour.day_of_week] ?? "";
      const time = hour.is_closed
        ? "مغلق"
        : `${formatOpeningTime(hour.opens_at)} - ${formatOpeningTime(hour.closes_at)}`;

      return `${day}: ${time}`;
    })
    .join(" • ");
}

function getPharmacyProducts(products: Product[], pharmacyId?: string | null) {
  if (!pharmacyId) {
    return [];
  }

  return products.filter((product) => product.vendor_id === pharmacyId);
}

function getCoverImage(products: Product[]) {
  return products.find((product) => product.image_url)?.image_url ?? null;
}

function formatCompactOpeningHours(hours?: Vendor["operating_hours"]) {
  if (!hours || hours.length === 0) {
    return ["ساعات العمل غير متاحة"];
  }

  const workingDays = hours.filter((hour) => !hour.is_closed);
  const fridayHours = workingDays.find((hour) => hour.day_of_week === 5);
  const otherDays = workingDays.filter((hour) => hour.day_of_week !== 5);

  const lines: string[] = [];

  const firstDay = otherDays[0];

  const sameOtherDays =
    firstDay &&
    otherDays.length > 0 &&
    otherDays.every(
      (hour) =>
        hour.opens_at === firstDay.opens_at &&
        hour.closes_at === firstDay.closes_at,
    );

  if (sameOtherDays && firstDay) {
    lines.push(
      `السبت - الخميس: ${formatOpeningTime(firstDay.opens_at)} - ${formatOpeningTime(firstDay.closes_at)}`,
    );
  } else {
    for (const hour of otherDays) {
      lines.push(
        `${dayLabels[hour.day_of_week]}: ${formatOpeningTime(hour.opens_at)} - ${formatOpeningTime(hour.closes_at)}`,
      );
    }
  }

  if (fridayHours) {
    lines.push(
      `الجمعة: ${formatOpeningTime(fridayHours.opens_at)} - ${formatOpeningTime(fridayHours.closes_at)}`,
    );
  }

  return lines;
}

export default function PharmacyDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ pharmacyId?: string | string[] }>();
  const pharmacyId = Array.isArray(params.pharmacyId) ? params.pharmacyId[0] : params.pharmacyId;
  const { data, loading, error, reload } = useCustomerCatalogData();
  const [isFavourite, setIsFavourite] = useState(false);
  const [favouriteLoading, setFavouriteLoading] = useState(false);
  const [showOpeningHours, setShowOpeningHours] = useState(false);
  const [pharmacyProducts, setPharmacyProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);

  useEffect(() => {
  if (!pharmacyId) {
    return;
  }

  void (async () => {
    try {
      setIsFavourite(await isFavouriteVendor(pharmacyId));
    } catch (error) {
      console.error(error);
    }
  })();
}, [pharmacyId]);

useEffect(() => {
  if (!pharmacyId) {
  setPharmacyProducts([]);
  return;
}

const currentPharmacyId = pharmacyId;
let cancelled = false;

  async function loadProducts() {
    try {
      setProductsLoading(true);
      setProductsError(null);

      const products = await loadVendorProducts(currentPharmacyId);

      if (!cancelled) {
        setPharmacyProducts(products);
      }
    } catch (error) {
      if (!cancelled) {
        setProductsError(
          error instanceof Error
            ? error.message
            : "تعذر تحميل منتجات الصيدلية.",
        );
      }
    } finally {
      if (!cancelled) {
        setProductsLoading(false);
      }
    }
  }

  void loadProducts();

  return () => {
    cancelled = true;
  };
}, [pharmacyId]);

  async function handleToggleFavourite() {
    if (!pharmacyId || favouriteLoading) {
      return;
    }

    try {
      setFavouriteLoading(true);
      const nextValue = await toggleFavouriteVendor(pharmacyId);
      setIsFavourite(nextValue);
    } catch (error) {
      console.error(error);
    } finally {
      setFavouriteLoading(false);
    }
  }

  const pharmacy = useMemo(() => getVendorById(data.vendors, pharmacyId), [data.vendors, pharmacyId]);

  const categoryCards = useMemo(
  () => buildPharmacyCategoryTree(data.categories).parents.slice(0, 6),
  [data.categories],
);

  const coverImage = useMemo(
    () => pharmacy?.image_url ?? getCoverImage(pharmacyProducts),
    [pharmacy?.image_url, pharmacyProducts],
  );

  const productCount = pharmacyProducts.length;
  const primaryAddress = getPrimaryAddress(
  data.addresses,
  data.defaultAddressId,
);

const distanceKm = calculateDistanceKm(
  primaryAddress,
  pharmacy,
);

const estimatedDeliveryFee =
distanceKm === null ? null : DEFAULT_DELIVERY_FEE_ESTIMATE;

  if (loading || productsLoading) {
    return (
      <Screen title="الصيدلية" subtitle="جارٍ تجهيز بيانات الصيدلية." backHref="/home" backLabel="العودة">
        <LoadingCard message="جارٍ تحميل الصيدلية..." />
      </Screen>
    );
  }

  if (error || productsError) {
    return (
      <Screen title="الصيدلية" subtitle="تعذر تحميل بيانات الصيدلية." backHref="/home" backLabel="العودة">
        <ErrorCard message={error ?? productsError ?? ""} onRetry={() => void reload()} />
      </Screen>
    );
  }

  if (!pharmacy) {
    return (
      <Screen title="الصيدلية" subtitle="هذه الصيدلية غير متاحة حاليًا." backHref="/home" backLabel="العودة">
        <EmptyCard
          title="الصيدلية غير متاحة"
          message="لم نتمكن من العثور على هذه الصيدلية ضمن المتاجر النشطة."
          action={<PrimaryButton label="العودة للرئيسية" onPress={() => router.push("/home")} />}
        />
      </Screen>
    );
  }

  return (
    <Screen title="" subtitle="">
      <View style={styles.hero}>
        <CatalogImage
          uri={coverImage}
          alt={pharmacy.name}
          fallbackLabel="صيدلية"
          containerStyle={styles.coverImageWrap}
          imageStyle={styles.coverImage}
        />

        <View style={styles.heroOverlay}>
          <Pressable style={styles.heroIconButton} onPress={() => router.back()}>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.text} />
          </Pressable>

          <Pressable style={styles.heroIconButton} onPress={() => void handleToggleFavourite()} disabled={favouriteLoading}>
            <Ionicons
              name={isFavourite ? "heart" : "heart-outline"}
              size={21}
              color={isFavourite ? "#D64545" : theme.colors.text}
            />
          </Pressable>
        </View>

        <View style={styles.logoWrap}>
          {pharmacy.image_url ? (
            <CatalogImage
              uri={pharmacy.image_url}
              alt={pharmacy.name}
              fallbackLabel={pharmacy.name.slice(0, 1)}
              containerStyle={styles.logoImageWrap}
              imageStyle={styles.logoImage}
            />
          ) : (
            <Text style={styles.logoText}>{pharmacy.name.slice(0, 1)}</Text>
          )}
        </View>
      </View>

      <View style={styles.headerCard}>
<View style={styles.titleRow}>
  <View style={styles.titleCopy}>
    <Text style={styles.pharmacyName}>{pharmacy.name}</Text>

    <Text style={styles.pharmacyAddress} numberOfLines={2}>
      {pharmacy.address || "صيدلية معتمدة"}
    </Text>
  </View>

  <View style={styles.statusBlock}>
    <View
      style={[
        styles.statusPill,
        pharmacy.is_open
          ? styles.statusPillOpen
          : styles.statusPillClosed,
      ]}
    >
      <Text
        style={[
          styles.statusText,
          pharmacy.is_open
            ? styles.statusTextOpen
            : styles.statusTextClosed,
        ]}
      >
        {pharmacy.is_open ? "مفتوحة الآن" : "مغلقة حالياً"}
      </Text>
    </View>

    <Pressable
      style={styles.hoursToggle}
      onPress={() =>
        setShowOpeningHours((current) => !current)
      }
    >
      <Ionicons
        name="time-outline"
        size={14}
        color={theme.colors.primaryDark}
      />

      <Text style={styles.hoursToggleText}>
  عن الصيدلية
</Text>

      <Ionicons
        name={
          showOpeningHours
            ? "chevron-up"
            : "chevron-down"
        }
        size={14}
        color={theme.colors.primaryDark}
      />
    </Pressable>
  </View>
</View>

{showOpeningHours ? (
  <View style={styles.openingHoursDropdown}>
    <Text style={styles.aboutSectionTitle}>ساعات العمل</Text>
{formatCompactOpeningHours(pharmacy.operating_hours).map((line) => (
  <Text key={line} style={styles.inlineOpeningHours}>
    {line}
  </Text>
))}

    {pharmacy.phone ? (
      <>
        <View style={styles.aboutDivider} />

        <Text style={styles.aboutSectionTitle}>التواصل</Text>

        <Pressable
          style={styles.contactRow}
          onPress={() => {
            void Linking.openURL(`tel:${pharmacy.phone}`);
          }}
        >
          <Ionicons name="call-outline" size={15} color={theme.colors.primaryDark} />

          <Text style={styles.inlineOpeningHours}>
            الهاتف: {pharmacy.phone}
          </Text>
        </Pressable>
      </>
    ) : null}
  </View>
) : null}

<View style={styles.quickStats}>
  <View style={styles.quickStat}>
    <Ionicons name="cube-outline" size={17} color={theme.colors.primaryDark} />
    <Text style={styles.quickStatValue}>{productCount}</Text>
    <Text style={styles.quickStatLabel}>منتج</Text>
  </View>

  <View style={styles.quickStatDivider} />

  <View style={styles.quickStat}>
    <Ionicons name="grid-outline" size={17} color={theme.colors.primaryDark} />
    <Text style={styles.quickStatValue}>{categoryCards.length}</Text>
    <Text style={styles.quickStatLabel}>فئات</Text>
  </View>

  <View style={styles.quickStatDivider} />

<View style={styles.quickStat}>
  <Ionicons
    name="location-outline"
    size={17}
    color={theme.colors.primaryDark}
  />

  <Text style={styles.quickStatValue}>
    {distanceKm !== null
      ? formatDistanceKm(distanceKm)
      : "—"}
  </Text>

  <Text style={styles.quickStatLabel}>
    المسافة
  </Text>
</View>

<View style={styles.quickStatDivider} />

<View style={styles.quickStat}>
  <Ionicons
    name="bicycle-outline"
    size={17}
    color={theme.colors.primaryDark}
  />

  <Text style={styles.quickStatValue}>
    {estimatedDeliveryFee !== null
      ? `${estimatedDeliveryFee} د.ل`
      : "—"}
  </Text>

  <Text style={styles.quickStatLabel}>
    التوصيل
  </Text>
</View>


</View>

</View>

<View style={styles.sectionHeader}>
          <SectionTitle label="الفئات المتاحة" />
        <Text style={styles.sectionHint}>اختر فئة لعرض منتجات هذه الصيدلية فقط</Text>
      </View>

      {categoryCards.length === 0 ? (
        <EmptyCard title="لا توجد فئات" message="لا توجد فئات مرتبطة بمنتجات هذه الصيدلية بعد." />
      ) : (
        <View style={styles.categoryGrid}>
  {categoryCards.map((category) => {
    const productCount = getPharmacyCategoryProductCount(
      pharmacyProducts,
      data.categories,
      category.id,
    );

    const categoryTheme = getCategoryTheme(category.category.slug);

    return (
      <Pressable
        key={category.id}
        style={[
          styles.categoryCard,
          {
            backgroundColor: categoryTheme.background,
            borderColor: categoryTheme.border,
          },
        ]}
        onPress={() =>
          router.push({
  pathname: "/categories/[categoryId]",
  params: {
    categoryId: category.id,
    pharmacyId: pharmacy.id,
  },
})
        }
      >

        <Text
          style={[styles.categoryTitle, { color: categoryTheme.text }]}
          numberOfLines={2}
        >
          {category.label}
        </Text>

        <Text
          style={[
            styles.categoryDescription,
            { color: categoryTheme.accent },
          ]}
          numberOfLines={1}
        >
          {category.subcategories.length} أقسام · {productCount} منتجات
        </Text>
      </Pressable>
    );
  })}
</View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 210,
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: theme.colors.accent,
  },
  coverImageWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  heroOverlay: {
    position: "absolute",
    top: theme.spacing[12],
    left: theme.spacing[12],
    right: theme.spacing[12],
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  logoWrap: {
    position: "absolute",
    right: theme.spacing[16],
    bottom: theme.spacing[16],
    width: 74,
    height: 74,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.95)",
  },
  logoText: {
    color: theme.colors.primaryDark,
    fontSize: 32,
    fontWeight: "900",
    textAlign: "center",
  },
  logoImageWrap: {
    width: "100%",
    height: "100%",
    borderRadius: 21,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  headerCard: {
    marginTop: -4,
    backgroundColor: theme.colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing[16],
    gap: theme.spacing[16],
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[12],
  },
  titleCopy: {
    flex: 1,
    gap: 5,
  },
  pharmacyName: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.xl,
    fontWeight: "900",
    textAlign: "right",
  },
  pharmacyAddress: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: 8,
    backgroundColor: theme.colors.accent,
  },
  statusText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
  },
  quickStats: {
    flexDirection: "row-reverse",
    alignItems: "stretch",
    borderRadius: 20,
    backgroundColor: "#F7FAF8",
    padding: theme.spacing[12],
  },
  quickStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  quickStatValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "center",
  },
  quickStatLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  quickStatDivider: {
    width: 1,
    backgroundColor: "#E3EEE7",
    marginVertical: 4,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionHint: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "700",
    textAlign: "right",
    marginTop: -8,
  },
categoryGrid: {
  flexDirection: "row",
  flexWrap: "wrap",
  justifyContent: "space-between",
},
categoryCard: {
  width: "31%",
  minHeight: 112,
  borderRadius: 18,
  borderWidth: 1,
  paddingVertical: theme.spacing[12],
  paddingHorizontal: theme.spacing[8],
  alignItems: "center",
  justifyContent: "center",
  gap: 7,
  marginBottom: theme.spacing[8],
},
categoryTitle: {
  fontSize: theme.typography.caption.md,
  fontWeight: "900",
  lineHeight: 17,
  textAlign: "center",
},
categoryDescription: {
  fontSize: 10,
  fontWeight: "800",
  textAlign: "center",
},
statusPillOpen: {
  backgroundColor: "#E4F4EA",
  borderWidth: 1,
  borderColor: "#CDEBDD",
},

statusPillClosed: {
  backgroundColor: "#FDECEC",
  borderWidth: 1,
  borderColor: "#F5CACA",
},

statusTextOpen: {
  color: "#127244",
},

statusTextClosed: {
  color: "#B42318",
},
statusBlock: {
  alignItems: "flex-end",
  gap: 8,
},

openingHoursDropdown: {
  borderRadius: 16,
  backgroundColor: "#F7FAF8",
  borderWidth: 1,
  borderColor: "#E3EEE7",
  padding: theme.spacing[12],
  gap: 6,
  alignItems: "flex-end",
},

hoursToggle: {
  flexDirection: "row-reverse",
  alignItems: "center",
  gap: 5,
  paddingVertical: 4,
},

hoursToggleText: {
  color: theme.colors.primaryDark,
  fontSize: 11,
  fontWeight: "900",
},

inlineOpeningHours: {
  color: theme.colors.muted,
  fontSize: 11,
  fontWeight: "700",
  lineHeight: 18,
  textAlign: "right",
},
openingHoursList: {
  gap: 4,
  alignItems: "flex-end",
},
contactRow: {
  flexDirection: "row-reverse",
  alignItems: "center",
  justifyContent: "flex-end",
  gap: 6,
  marginTop: 10,
},
aboutSectionTitle: {
  color: theme.colors.text,
  fontSize: 12,
  fontWeight: "900",
  textAlign: "right",
},

aboutDivider: {
  height: 1,
  alignSelf: "stretch",
  backgroundColor: "#E3EEE7",
  marginVertical: 6,
},
});