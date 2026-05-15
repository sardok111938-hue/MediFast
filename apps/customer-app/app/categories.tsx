import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { ErrorCard, LoadingCard, Screen, SectionTitle } from "../src/components/CustomerUI";
import {
  buildPharmacyCategoryTree,
  getCategoryIcon,
  getCategoryTheme,
  getPharmacyCategoryProductCount,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerCatalogData();
  const parentCategories = useMemo(() => buildPharmacyCategoryTree(data.categories).parents, [data.categories]);

  return (
    <Screen title="الفئات" subtitle="تصفح أقسام الصيدلية الرئيسية بتجربة منظمة وواضحة.">
      {loading ? <LoadingCard message="جارٍ تحميل الفئات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      <SectionTitle label="الفئات الرئيسية" />

      <View style={styles.grid}>
        {parentCategories.map((category) => {
          const productCount = getPharmacyCategoryProductCount(data.products, data.categories, category.id);
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
                  params: { categoryId: category.id },
                })
              }
            >
              <View style={[styles.iconBadge, { backgroundColor: categoryTheme.accentSoft }]}>
                <Ionicons name={getCategoryIcon(category.category.slug) as IconName} size={22} color={categoryTheme.accent} />
              </View>

              <Text style={[styles.categoryTitle, { color: categoryTheme.text }]} numberOfLines={2}>
                {category.label}
              </Text>

              <Text style={[styles.categoryDescription, { color: categoryTheme.accent }]} numberOfLines={1}>
                {category.subcategories.length} أقسام · {productCount} منتجات
              </Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  categoryCard: {
    width: "31%",
    minHeight: 112,
    marginBottom: 10,
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: theme.spacing[12],
    paddingHorizontal: theme.spacing[8],
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  iconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
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
});