import { useMemo } from "react";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, Pill, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import { getCustomerCategories } from "../src/lib/customer-catalog";

const categoryDescriptions: Record<string, string> = {
  "cat-1": "Pain relief, cold remedies, and essential over-the-counter treatments.",
  "cat-2": "Daily vitamins, immunity support, and supplements for routine wellness.",
  "cat-3": "Gentle cleansers, serums, and pharmacy-grade skincare picks.",
  "cat-4": "Trusted baby care, feeding, and daily family essentials.",
  "cat-5": "Thermometers, monitors, and practical home medical devices.",
  "cat-6": "Personal hygiene, oral care, and everyday health basics.",
};

export default function CategoriesScreen() {
  const router = useRouter();
  const categories = useMemo(() => getCustomerCategories(), []);

  return (
    <Screen title="Categories" subtitle="Browse the catalog by need and jump straight into the right aisle.">
      <SectionTitle label="All Categories" actionLabel="Search" onAction={() => router.push("/search")} />
      <View style={styles.grid}>
        {categories.map((category) => (
          <Card key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{category.name}</Text>
              <Pill label="Popular" tone="info" />
            </View>
            <Text style={styles.categoryDescription}>{categoryDescriptions[category.id] ?? "Browse pharmacy essentials in this section."}</Text>
            <PrimaryButton
              label="Open category"
              onPress={() =>
                router.push({
                  pathname: "/product-listing",
                  params: { categoryId: category.id },
                })
              }
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: theme.spacing[12],
  },
  categoryCard: {
    gap: theme.spacing[16],
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing[12],
  },
  categoryTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
  },
  categoryDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
  },
});
