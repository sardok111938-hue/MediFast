import { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../src/components/CatalogImage";
import { EmptyCard, ErrorCard, LoadingCard, PrimaryButton, SearchInput } from "../../src/components/CustomerUI";
import { filterProducts, getVendorById, useCustomerCatalogData } from "../../src/lib/customer-catalog";
import { formatCustomerCurrency } from "../../src/lib/customer-orders";

type SearchFilter = "relevant" | "available" | "cheaper";

export default function SearchScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ query?: string | string[] }>();
  const initialQuery = Array.isArray(params.query) ? params.query[0] : params.query;

  const [query, setQuery] = useState(initialQuery ?? "");
  
  useEffect(() => {
    setQuery(initialQuery ?? "");
}, [initialQuery]);

  const [filters, setFilters] = useState<SearchFilter[]>(["relevant"]);

  const { data, loading, error, reload } = useCustomerCatalogData();

  function toggleFilter(filter: SearchFilter) {
    setFilters((current) => {
      if (current.includes(filter)) {
        return current.filter((item) => item !== filter);
      }

      return [...current, filter];
    });
  }

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();

    let filtered = filterProducts(data.products, { query });

    if (filters.includes("available")) {
      filtered = filtered.filter((product) => (product.stock_quantity ?? 0) > 0);
    }

    return [...filtered].sort((a, b) => {
      if (filters.includes("cheaper")) {
        return Number(a.price ?? 0) - Number(b.price ?? 0);
      }

      if (filters.includes("relevant") && term) {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aExact = aName === term;
        const bExact = bName === term;

        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aName.startsWith(term);
        const bStarts = bName.startsWith(term);

        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
      }

      return 0;
    });
  }, [data.products, query, filters]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
    >
      <SearchInput placeholder="ابحث عن دواء أو منتج" value={query} onChangeText={setQuery} />

      <View style={styles.toolbarRow}>
  <View style={styles.chipsRow}>
    <FilterChip label="الأكثر صلة" active={filters.includes("relevant")} onPress={() => toggleFilter("relevant")} />
    <FilterChip label="المتوفر" active={filters.includes("available")} onPress={() => toggleFilter("available")} />
    <FilterChip label="الأرخص" active={filters.includes("cheaper")} onPress={() => toggleFilter("cheaper")} />
  </View>

  <Text style={styles.resultsCount}>
    {results.length} منتج
  </Text>
</View>

      {loading ? <LoadingCard message="جارٍ تحميل نتائج البحث..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      {!loading && !error ? (
        <>
          {results.length === 0 ? (
            <EmptyCard
              title="لا توجد نتائج"
              message="جرّب كلمة مختلفة أو امسح البحث."
              action={<PrimaryButton label="مسح البحث" onPress={() => setQuery("")} />}
            />
          ) : (
            <View style={styles.resultList}>
              {results.map((product) => {
                const vendor = getVendorById(data.vendors, product.vendor_id);
                const inStock = (product.stock_quantity ?? 0) > 0;

                return (
                  <Pressable
                    key={product.id}
                    style={styles.resultCard}
                    onPress={() =>
                      router.push({
                        pathname: "/product-detail",
                        params: { productId: product.id },
                      })
                    }
                  >
                    <CatalogImage
                      uri={product.image_url}
                      alt={product.name}
                      fallbackLabel="منتج"
                      containerStyle={styles.productImageWrap}
                      imageStyle={styles.productImage}
                    />

                    <View style={styles.productBody}>
                      <View style={styles.productTopRow}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {product.name}
                        </Text>

                        <View style={[styles.stockPill, inStock ? styles.stockPillOk : styles.stockPillOff]}>
                          <Text style={[styles.stockPillText, inStock ? styles.stockTextOk : styles.stockTextOff]}>
                            {inStock ? "متوفر" : "غير متوفر"}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.vendorName} numberOfLines={1}>
                        {vendor?.name ?? "صيدلية"}
                      </Text>

                      <View style={styles.productBottomRow}>
                        <Text style={styles.price}>{formatCustomerCurrency(Number(product.price ?? 0))}</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </>
      ) : null}
    </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.filterChip, active ? styles.filterChipActive : null]} onPress={onPress}>
      <Text style={[styles.filterChipText, active ? styles.filterChipTextActive : null]}>{label}</Text>
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
    gap: theme.spacing[14],
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
    justifyContent: "flex-start",
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
  paddingBottom: theme.spacing[32],
},
content: {
  paddingHorizontal: theme.spacing[16],
  paddingTop: theme.spacing[16],
  paddingBottom: 120,
},
});