import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import {
  EmptyCard,
  ErrorCard,
  LoadingCard,
  PrimaryButton,
  SearchInput,
} from "../../src/components/CustomerUI";
import {
  groupProductsByMarketplaceListing,
  searchProducts,
  useCustomerCatalogData,
} from "../../src/lib/customer-catalog";
import type { GroupedProduct } from "../../src/lib/customer-catalog";

type SearchFilter = "relevant" | "available" | "cheaper";

type QuickSearchItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  categorySlug: string;
};

const quickSearches: QuickSearchItem[] = [
  { label: "الكل", icon: "grid-outline", categorySlug: "__all__" },
  { label: "مسكنات", icon: "medkit-outline", categorySlug: "pain-relief" },
  {
    label: "فيتامينات",
    icon: "nutrition-outline",
    categorySlug: "daily-vitamins",
  },
  {
    label: "أدوية البرد",
    icon: "thermometer-outline",
    categorySlug: "cold-flu",
  },
  { label: "الحساسية", icon: "leaf-outline", categorySlug: "allergy" },
  { label: "السكري", icon: "fitness-outline", categorySlug: "diabetes" },
  { label: "الضغط", icon: "heart-outline", categorySlug: "blood-pressure" },
  {
    label: "العناية بالبشرة",
    icon: "sparkles-outline",
    categorySlug: "skin-care",
  },
  { label: "العناية بالشعر", icon: "cut-outline", categorySlug: "hair-care" },
  {
    label: "أدوية الأطفال",
    icon: "happy-outline",
    categorySlug: "baby-medicine",
  },
  { label: "العطور", icon: "rose-outline", categorySlug: "perfumes" },
  {
    label: "الجروح",
    icon: "bandage-outline",
    categorySlug: "wounds-dressings",
  },
  { label: "المعدة", icon: "body-outline", categorySlug: "digestive-health" },
];

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string | string[] }>();
  const initialQuery = Array.isArray(params.query)
    ? params.query[0]
    : params.query;

  const [query, setQuery] = useState(initialQuery ?? "");
  const [filters, setFilters] = useState<SearchFilter[]>(["relevant"]);

  const {
    data,
    loading: catalogLoading,
    error: catalogError,
    reload,
  } = useCustomerCatalogData();
  const [results, setResults] = useState<GroupedProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery ?? "");
  }, [initialQuery]);

  function toggleFilter(filter: SearchFilter) {
    setFilters((current) => {
      if (current.includes(filter)) {
        return current.filter((item) => item !== filter);
      }

      return [...current, filter];
    });
  }

  useEffect(() => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      setResults([]);
      setSearchError(null);
      setSearchLoading(false);
      return;
    }

    let cancelled = false;

    async function runSearch() {
      setSearchLoading(true);
      setSearchError(null);

      try {
        let foundProducts = await searchProducts(trimmedQuery);

        if (filters.includes("available")) {
          foundProducts = foundProducts.filter(
            (product) => (product.stock_quantity ?? 0) > 0,
          );
        }

        if (filters.includes("cheaper")) {
          foundProducts = [...foundProducts].sort(
            (a, b) => Number(a.price ?? 0) - Number(b.price ?? 0),
          );
        }

        let groupedResults = groupProductsByMarketplaceListing(
          foundProducts,
          data.vendors,
        );

        if (filters.includes("cheaper")) {
          groupedResults = [...groupedResults].sort(
            (a, b) => a.lowestPrice - b.lowestPrice,
          );
        }

        if (!cancelled) {
          setResults(groupedResults);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchError(
            error instanceof Error ? error.message : "تعذر تحميل نتائج البحث.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    const timeout = setTimeout(() => {
      void runSearch();
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, filters, data.vendors]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.searchInputWrap}>
          <SearchInput
            placeholder="ابحث عن دواء أو منتج"
            value={query}
            onChangeText={setQuery}
          />

          {query.trim().length > 0 ? (
            <Pressable
              style={styles.clearSearchButton}
              onPress={() => setQuery("")}
            >
              <Ionicons
                name="close-circle"
                size={18}
                color={theme.colors.muted}
              />
            </Pressable>
          ) : null}
        </View>

        {query.trim().length > 0 ? (
          <View style={styles.toolbarRow}>
            <View style={styles.chipsRow}>
              <FilterChip
                label="الأكثر صلة"
                active={filters.includes("relevant")}
                onPress={() => toggleFilter("relevant")}
              />
              <FilterChip
                label="المتوفر"
                active={filters.includes("available")}
                onPress={() => toggleFilter("available")}
              />
              <FilterChip
                label="الأرخص"
                active={filters.includes("cheaper")}
                onPress={() => toggleFilter("cheaper")}
              />
            </View>

            <Text style={styles.resultsCount}>{results.length} منتج</Text>
          </View>
        ) : null}

        {searchLoading || catalogLoading ? (
          <LoadingCard message="جارٍ تحميل نتائج البحث..." />
        ) : null}
        {!searchLoading && (searchError || catalogError) ? (
          <ErrorCard
            message={searchError ?? catalogError ?? ""}
            onRetry={() => void reload()}
          />
        ) : null}
        {!searchLoading && !catalogLoading && !searchError && !catalogError ? (
          <>
            {query.trim().length === 0 ? (
              <View style={styles.searchGuideCard}>
                <View style={styles.searchGuideIcon}>
                  <Ionicons
                    name="search-outline"
                    size={24}
                    color={theme.colors.primaryDark}
                  />
                </View>

                <Text style={styles.suggestedTitle}>عمّا تبحث اليوم؟</Text>

                <Text style={styles.suggestedSubtitle}>
                  اختر من الاقتراحات السريعة أو اكتب اسم الدواء في الأعلى
                </Text>

                <View style={styles.quickSearchGrid}>
                  {quickSearches.map((item) => (
                    <Pressable
                      key={item.label}
                      style={({ pressed }) => [
                        styles.quickSearchChip,
                        pressed ? styles.quickSearchChipPressed : null,
                      ]}
                      onPress={() => {
                        if (item.categorySlug === "__all__") {
                          router.push("/products");
                          return;
                        }
                        const matchedCategory = data.categories.find(
                          (category) => category.slug === item.categorySlug,
                        );

                        if (matchedCategory) {
                          router.push({
                            pathname: "/categories/[categoryId]",
                            params: { categoryId: matchedCategory.id },
                          });

                          return;
                        }

                        setQuery(item.label);
                      }}
                    >
                      <Ionicons
                        name={item.icon}
                        size={17}
                        color={theme.colors.primaryDark}
                      />
                      <Text style={styles.quickSearchText}>{item.label}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : results.length === 0 ? (
              <EmptyCard
                title="لا توجد نتائج"
                message="جرّب كلمة مختلفة أو امسح البحث."
                action={
                  <PrimaryButton
                    label="مسح البحث"
                    onPress={() => setQuery("")}
                  />
                }
              />
            ) : (
              <View style={styles.resultList}>
                {results.map((product) => (
                  <Pressable
                    key={product.id}
                    style={styles.resultCard}
                    onPress={() =>
                      router.push({
                        pathname: "/grouped-product/[groupId]",
                        params: { groupId: product.id },
                      })
                    }
                  >
                    <CatalogImage
                      uri={product.image_url}
                      alt={product.name}
                      fallbackLabel="منتج"
                      containerStyle={styles.productImageWrap}
                      imageStyle={styles.productImage}
                      resizeMode="contain"
                    />

                    <View style={styles.productBody}>
                      <View style={styles.productTopRow}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>
                      </View>

                      <Text style={styles.vendorName} numberOfLines={1}>
                        متوفر في {product.pharmaciesCount} صيدليات
                      </Text>

                      <View style={styles.productBottomRow}>
                        <Text style={styles.price}>
                          يبدأ من {formatPrice(product.lowestPrice)} د.ل
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.filterChip, active ? styles.filterChipActive : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.filterChipText,
          active ? styles.filterChipTextActive : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  toolbarRow: {
    marginTop: theme.spacing[20],
    marginBottom: theme.spacing[24],
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chipsRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: theme.spacing[8],
    paddingBottom: 2,
  },
  filterChip: {
    alignSelf: "flex-start",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
  },
  filterChipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accent,
  },
  filterChipText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
  },
  filterChipTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
  },
  resultsCount: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "left",
    marginLeft: theme.spacing[12],
  },
  resultList: {
    gap: theme.spacing[16],
  },
  resultCard: {
    flexDirection: "row",
    gap: theme.spacing[12],
    padding: theme.spacing[12],
    borderRadius: 22,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  productImageWrap: {
    width: 84,
    height: 84,
    borderRadius: 18,
    backgroundColor: "#F2F6F3",
    overflow: "hidden",
  },
  productImage: {
    width: "100%",
    height: "100%",
  },
  productBody: {
    flex: 1,
    minHeight: 84,
    paddingVertical: 2,
    paddingRight: theme.spacing[4],
    justifyContent: "space-between",
  },
  productTopRow: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    gap: theme.spacing[8],
  },
  productName: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    lineHeight: 20,
    fontWeight: "900",
    textAlign: "right",
  },
  vendorName: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "right",
  },
  productBottomRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: theme.spacing[8],
  },
  price: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  stockPill: {
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  stockPillOk: {
    backgroundColor: "#E3F3E9",
  },
  stockPillOff: {
    backgroundColor: "#F7E4E7",
  },
  stockPillText: {
    fontSize: 9,
    fontWeight: "900",
  },
  stockTextOk: {
    color: theme.colors.primaryDark,
  },
  stockTextOff: {
    color: theme.colors.danger,
  },
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[16],
    paddingBottom: 120,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonDisabled: {
    opacity: 0.4,
  },
  addButtonAdded: {
    backgroundColor: "#15803D",
  },
  searchInputWrap: {
    position: "relative",
    justifyContent: "center",
  },

  clearSearchButton: {
    position: "absolute",
    left: 14,
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  searchGuideCard: {
    marginTop: theme.spacing[24],
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "#DDEBE2",
    backgroundColor: "#F7FBF8",
    paddingHorizontal: theme.spacing[20],
    paddingVertical: theme.spacing[24],
    alignItems: "center",
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 7 },
    elevation: 1,
  },

  searchGuideIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: theme.spacing[12],
  },

  suggestedTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "center",
  },

  suggestedSubtitle: {
    marginTop: 6,
    marginBottom: theme.spacing[20],
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    lineHeight: 20,
    fontWeight: "700",
    textAlign: "center",
  },

  quickSearchGrid: {
    width: "100%",
    marginTop: theme.spacing[8],
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: theme.spacing[12],
  },

  quickSearchChip: {
    minHeight: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#D7ECDD",
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[8],
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 6,
  },

  quickSearchChipPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },

  quickSearchText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "center",
  },
});
