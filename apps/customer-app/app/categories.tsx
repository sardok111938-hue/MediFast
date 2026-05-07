import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { formatCategoryLabel } from "@medifast/i18n";
import { theme } from "@medifast/ui";
import { Card, ErrorCard, LoadingCard, Pill, PrimaryButton, Screen, SectionTitle } from "../src/components/CustomerUI";
import { useCustomerCatalogData } from "../src/lib/customer-catalog";

const categoryDescriptions: Record<string, string> = {
  Medicine: "مسكنات وعلاجات البرد والأدوية الأساسية للاستخدام اليومي.",
  Vitamins: "فيتامينات ومكملات لدعم المناعة والصحة العامة.",
  "Skin Care": "منظفات وسيروم وعناية بالبشرة من الصيدلية.",
  "Medical Devices": "أجهزة منزلية عملية مثل مقاييس الحرارة ومستلزمات المتابعة.",
  "Baby Care": "منتجات موثوقة للعناية بالأطفال والرضع.",
  "Personal Care": "عناية شخصية ونظافة يومية ومنتجات أساسية للمنزل.",
};

export default function CategoriesScreen() {
  const router = useRouter();
  const { data, loading, error, reload } = useCustomerCatalogData();

  return (
    <Screen title="الفئات" subtitle="تصفح المنتجات حسب الاحتياج واختر القسم المناسب بسرعة.">
      {loading ? <LoadingCard message="جارٍ تحميل الفئات..." /> : null}
      {!loading && error ? <ErrorCard message={error} onRetry={() => void reload()} /> : null}
      <SectionTitle label="كل الفئات" actionLabel="البحث" onAction={() => router.push("/search")} />
      <View style={styles.grid}>
        {data.categories.map((category) => (
          <Card key={category.id} style={styles.categoryCard}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryTitle}>{formatCategoryLabel(category)}</Text>
              <Pill label="الأكثر طلبًا" tone="info" />
            </View>
            <Text style={styles.categoryDescription}>{categoryDescriptions[category.name] ?? "تصفح احتياجات الصيدلية ضمن هذا القسم."}</Text>
            <PrimaryButton
              label="فتح الفئة"
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
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: theme.spacing[12],
  },
  categoryTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "800",
    textAlign: "right",
  },
  categoryDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.body,
    textAlign: "right",
  },
});
