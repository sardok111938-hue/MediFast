import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { ComponentProps } from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, ErrorCard, LoadingCard, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import {
  getParentCategories,
  getPharmacyCategoryImage,
  getPharmacyCategoryProductCount,
  getPharmacyParentCategoryById,
  useCustomerCatalogData,
} from "../src/lib/customer-catalog";
import { CatalogImage } from "../src/components/CatalogImage";

type IconName = ComponentProps<typeof Ionicons>["name"];

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerCatalogData();
  const parentCategories = getParentCategories(data.categories)
    .map((category) => getPharmacyParentCategoryById(data.categories, category.id))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  return (
    <Screen title="الفئات" subtitle="تصفح أقسام الصيدلية الرئيسية بتجربة منظمة وواضحة.">
      {loading ? <LoadingCard message="جارٍ تحميل الفئات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}

      <SectionTitle label="الفئات الرئيسية" />
      <View style={styles.grid}>
        {parentCategories.map((category) => {
          const productCount = getPharmacyCategoryProductCount(data.products, data.categories, category.id);

          return (
            <Card key={category.id} style={styles.categoryCard}>
              <View style={styles.categoryRow}>
                <CatalogImage
                  uri={getPharmacyCategoryImage(data.products, data.categories, category.id)}
                  alt={category.label}
                  fallbackLabel=""
                  containerStyle={styles.categoryImageWrap}
                  imageStyle={styles.categoryImage}
                />
                <View style={styles.categoryCopy}>
                  <View style={styles.titleRow}>
                    <View style={styles.iconBadge}>
                      <Ionicons name={category.icon as IconName} size={18} color={theme.colors.primaryDark} />
                    </View>
                    <Text style={styles.categoryTitle}>{category.label}</Text>
                  </View>
                  <Text style={styles.categoryDescription}>
                    {category.subcategories.length > 0 ? `${category.subcategories.length} أقسام فرعية` : "قسم رئيسي"}
                    {" · "}
                    {productCount} منتجات
                  </Text>
                </View>
              </View>
              <PrimaryButton
                label="فتح الفئة"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/categories/[categoryId]",
                    params: { categoryId: category.id },
                  })
                }
              />
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: theme.spacing[12],
  },
  categoryCard: {
    gap: theme.spacing[12],
  },
  categoryRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  categoryImageWrap: {
    width: 78,
    height: 78,
    borderRadius: 22,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryCopy: {
    flex: 1,
    gap: theme.spacing[8],
  },
  titleRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: theme.spacing[8],
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accent,
  },
  categoryTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.heading.md,
    fontWeight: "900",
    textAlign: "right",
  },
  categoryDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
    textAlign: "right",
  },
});
