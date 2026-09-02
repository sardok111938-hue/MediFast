import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { theme } from "@medifast/ui";
import { CatalogImage } from "../../../ui/media/CatalogImage";
import {
  EmptyCard,
  ErrorCard,
  LoadingCard,
} from "../../../ui";
import {
  groupProductsByMarketplaceListing,
  useCustomerCatalogData,
  vendorTypeFilters,
} from "./customer-catalog";
import type { VendorTypeFilter } from "./customer-catalog";

const PAGE_SIZE = 8;

function formatPrice(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export default function ProductsScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerCatalogData();

  const [filterOpen, setFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [vendorTypeFilter, setVendorTypeFilter] = useState<VendorTypeFilter>("all");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<
    string | null
  >(null);

  const categoriesById = useMemo(
    () => new Map(data.categories.map((category) => [category.id, category])),
    [data.categories],
  );

  const parentCategories = useMemo(
    () =>
      data.categories
        .filter((category) => !category.parent_id)
        .sort((left, right) => {
          const leftOrder = left.sort_order ?? 0;
          const rightOrder = right.sort_order ?? 0;

          if (leftOrder !== rightOrder) {
            return leftOrder - rightOrder;
          }

          return left.name.localeCompare(right.name, "ar");
        }),
    [data.categories],
  );

  const visibleSubcategories = useMemo(() => {
    if (!selectedParentId) {
      return [];
    }

    return data.categories
      .filter((category) => category.parent_id === selectedParentId)
      .sort((left, right) => {
        const leftOrder = left.sort_order ?? 0;
        const rightOrder = right.sort_order ?? 0;

        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }

        return left.name.localeCompare(right.name, "ar");
      });
  }, [data.categories, selectedParentId]);

  const selectedCategoryIds = useMemo(() => {
    if (!selectedParentId) {
      return null;
    }

    const ids = new Set<string>();
    const startId = selectedSubcategoryId ?? selectedParentId;
    const queue = [startId];

    while (queue.length > 0) {
      const currentId = queue.shift();

      if (!currentId || ids.has(currentId)) {
        continue;
      }

      ids.add(currentId);

      data.categories.forEach((category) => {
        if (category.parent_id === currentId) {
          queue.push(category.id);
        }
      });
    }

    return ids;
  }, [data.categories, selectedParentId, selectedSubcategoryId]);

  const vendorFilteredProducts = useMemo(() => {
    if (vendorTypeFilter === "all") {
      return data.products;
    }

    const matchingVendorIds = new Set(
      data.vendors
        .filter((vendor) => vendor.vendor_type === vendorTypeFilter)
        .map((vendor) => vendor.id),
    );

    return data.products.filter((product) =>
      matchingVendorIds.has(product.vendor_id),
    );
  }, [data.products, data.vendors, vendorTypeFilter]);

  const filteredProducts = useMemo(
    () =>
      groupProductsByMarketplaceListing(vendorFilteredProducts, data.vendors)
        .filter((product) => {
          if (!selectedCategoryIds) {
            return true;
          }

          return product.offers.some((offer) => {
            const categoryId = offer.product.category_id;

            return categoryId ? selectedCategoryIds.has(categoryId) : false;
          });
        })
        .sort((left, right) => {
          const leftHasImage = left.image_url ? 1 : 0;
          const rightHasImage = right.image_url ? 1 : 0;

          if (rightHasImage !== leftHasImage) {
            return rightHasImage - leftHasImage;
          }

          return left.name.localeCompare(right.name, "ar");
        }),
    [data.vendors, selectedCategoryIds, vendorFilteredProducts],
  );

  const products = useMemo(
    () => filteredProducts.slice(0, visibleCount),
    [filteredProducts, visibleCount],
  );

  const hasMoreProducts = products.length < filteredProducts.length;

  const selectedParentCategory = selectedParentId
    ? categoriesById.get(selectedParentId)
    : null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={styles.headerIconButton}
          >
            <Ionicons
              name="arrow-forward"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>

          <Text style={styles.title}>كل المنتجات</Text>

          <Pressable
            onPress={() => setFilterOpen(true)}
            style={styles.headerIconButton}
          >
            <Ionicons
              name="options-outline"
              size={24}
              color={theme.colors.text}
            />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            flexDirection: "row-reverse",
            gap: theme.spacing[8],
            paddingBottom: theme.spacing[12],
          }}
        >
          {vendorTypeFilters.map((filter) => {
            const active = vendorTypeFilter === filter.value;

            return (
              <Pressable
                key={filter.value}
                style={[
                  {
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    backgroundColor: theme.colors.surface,
                    paddingHorizontal: theme.spacing[12],
                    paddingVertical: theme.spacing[8],
                  },
                  active
                    ? {
                        borderColor: theme.colors.primary,
                        backgroundColor: theme.colors.accent,
                      }
                    : null,
                ]}
                onPress={() => {
                  setVendorTypeFilter(filter.value);
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                <Text
                  style={[
                    {
                      color: theme.colors.muted,
                      fontSize: theme.typography.caption.md,
                      fontWeight: "800",
                    },
                    active
                      ? {
                          color: theme.colors.primaryDark,
                          fontWeight: "900",
                        }
                      : null,
                  ]}
                >
                  {filter.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? <LoadingCard message="جارٍ تحميل المنتجات..." /> : null}

        {!loading && error ? (
          <ErrorCard message={error} onRetry={() => void reload()} />
        ) : null}

        {!loading && !error && products.length === 0 ? (
          <EmptyCard
            title="لا توجد منتجات"
            message="لا توجد منتجات متاحة حالياً."
          />
        ) : null}

        {!loading && !error && products.length > 0 ? (
          <>
            <View style={styles.resultList}>
              {products.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.resultCard}
                  onPress={() =>
                    router.push({
                      pathname: "/grouped-product/[groupId]",
                      params: {
                        groupId: product.id,
                        ...(vendorTypeFilter === "all"
                          ? {}
                          : { vendorType: vendorTypeFilter }),
                      },
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
                    <Text style={styles.productName} numberOfLines={2}>
                      {product.name}
                    </Text>

                    <Text style={styles.vendorName} numberOfLines={1}>
                      متوفر في {product.pharmaciesCount} متاجر
                    </Text>

                    <Text style={styles.price}>
                      يبدأ من {formatPrice(product.lowestPrice)} د.ل
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>

            {hasMoreProducts ? (
              <Pressable
                style={styles.loadMoreButton}
                onPress={() => setVisibleCount((count) => count + PAGE_SIZE)}
              >
                <Text style={styles.loadMoreButtonText}>عرض المزيد</Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      <Modal visible={filterOpen} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.backdropPressable}
            onPress={() => setFilterOpen(false)}
          />

          <View style={styles.filterSheet}>
            <View style={styles.filterHeader}>
              <Text style={styles.filterTitle}>تصفية المنتجات</Text>

              <Pressable
                onPress={() => setFilterOpen(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={theme.colors.text} />
              </Pressable>
            </View>

            <View style={styles.filterColumns}>
              <ScrollView
                style={styles.parentColumn}
                contentContainerStyle={styles.columnContent}
                showsVerticalScrollIndicator={false}
              >
                <Pressable
                  style={[
                    styles.parentRow,
                    selectedParentId === null ? styles.parentRowActive : null,
                  ]}
                  onPress={() => {
                    setSelectedParentId(null);
                    setSelectedSubcategoryId(null);
                    setVisibleCount(PAGE_SIZE);
                    setFilterOpen(false);
                  }}
                >
                  <Text
                    style={[
                      styles.parentRowText,
                      selectedParentId === null
                        ? styles.parentRowTextActive
                        : null,
                    ]}
                  >
                    الكل
                  </Text>
                </Pressable>

                {parentCategories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.parentRow,
                      selectedParentId === category.id
                        ? styles.parentRowActive
                        : null,
                    ]}
                    onPress={() => {
                      setSelectedParentId(category.id);
                      setSelectedSubcategoryId(null);
                      setVisibleCount(PAGE_SIZE);
                    }}
                  >
                    <Text
                      style={[
                        styles.parentRowText,
                        selectedParentId === category.id
                          ? styles.parentRowTextActive
                          : null,
                      ]}
                      numberOfLines={2}
                    >
                      {category.name_ar ?? category.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <ScrollView
                style={styles.subcategoryColumn}
                contentContainerStyle={styles.columnContent}
                showsVerticalScrollIndicator={false}
              >
                {selectedParentCategory ? (
                  <>
                    <Pressable
                      style={[
                        styles.subcategoryItem,
                        selectedSubcategoryId === null
                          ? styles.subcategoryItemActive
                          : null,
                      ]}
                      onPress={() => {
                        setSelectedSubcategoryId(null);
                        setVisibleCount(PAGE_SIZE);
                        setFilterOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.subcategoryItemText,
                          selectedSubcategoryId === null
                            ? styles.subcategoryItemTextActive
                            : null,
                        ]}
                      >
                        كل{" "}
                        {selectedParentCategory.name_ar ??
                          selectedParentCategory.name}
                      </Text>

                      {selectedSubcategoryId === null ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={theme.colors.primary}
                        />
                      ) : null}
                    </Pressable>

                    {visibleSubcategories.map((category) => (
                      <Pressable
                        key={category.id}
                        style={[
                          styles.subcategoryItem,
                          selectedSubcategoryId === category.id
                            ? styles.subcategoryItemActive
                            : null,
                        ]}
                        onPress={() => {
                          setSelectedSubcategoryId(category.id);
                          setVisibleCount(PAGE_SIZE);
                          setFilterOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.subcategoryItemText,
                            selectedSubcategoryId === category.id
                              ? styles.subcategoryItemTextActive
                              : null,
                          ]}
                          numberOfLines={2}
                        >
                          {category.name_ar ?? category.name}
                        </Text>

                        {selectedSubcategoryId === category.id ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={20}
                            color={theme.colors.primary}
                          />
                        ) : null}
                      </Pressable>
                    ))}
                  </>
                ) : (
                  <View style={styles.emptySubcategoryBox}>
                    <Text style={styles.emptySubcategoryText}>
                      اختر فئة رئيسية لعرض التصنيفات الفرعية
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: theme.spacing[16],
    paddingTop: theme.spacing[16],
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing[20],
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "900",
    textAlign: "center",
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
  productName: {
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
  price: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    textAlign: "right",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    justifyContent: "flex-end",
  },
  backdropPressable: {
    flex: 1,
  },
  filterSheet: {
    height: "62%",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: theme.colors.background,
    paddingTop: theme.spacing[16],
    overflow: "hidden",
  },
  filterHeader: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing[20],
    paddingBottom: theme.spacing[16],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.surface,
  },
  filterColumns: {
    flex: 1,
    flexDirection: "row-reverse",
  },
  parentColumn: {
    width: 136,
    backgroundColor: theme.colors.surface,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  subcategoryColumn: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  columnContent: {
    padding: theme.spacing[12],
    gap: theme.spacing[8],
  },
  parentRow: {
    minHeight: 48,
    borderRadius: 16,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
    justifyContent: "center",
  },
  parentRowActive: {
    backgroundColor: theme.colors.accent,
  },
  parentRowText: {
    color: theme.colors.muted,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "right",
  },
  parentRowTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
  },
  subcategoryItem: {
    minHeight: 52,
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "space-between",
    gap: theme.spacing[8],
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing[12],
    paddingVertical: theme.spacing[12],
  },
  subcategoryItemActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.accent,
  },
  subcategoryItemText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    textAlign: "right",
  },
  subcategoryItemTextActive: {
    color: theme.colors.primaryDark,
    fontWeight: "900",
  },
  emptySubcategoryBox: {
    minHeight: 140,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing[16],
  },
  emptySubcategoryText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.md,
    fontWeight: "800",
    lineHeight: 22,
    textAlign: "center",
  },
  loadMoreButton: {
    marginTop: theme.spacing[20],
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing[12],
    alignItems: "center",
  },

  loadMoreButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.body.md,
    fontWeight: "900",
  },
});
