import type { Product } from "@medifast/types";
import { theme } from "@medifast/ui";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CustomerProductCard } from "../src/components/CustomerProductCard";
import { listFavoriteProductIds } from "../src/lib/favorites";
import { loadCustomerCatalogData } from "../src/lib/customer-catalog";

export default function FavoritesScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadFavorites() {
        setLoading(true);

        try {
          const [ids, catalog] = await Promise.all([
  listFavoriteProductIds(),
  loadCustomerCatalogData(),
]);

          if (!mounted) {
            return;
          }

          setFavoriteIds(ids);
          setProducts(catalog.products.filter((product: Product) => ids.includes(product.id)));
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      void loadFavorites();

      return () => {
        mounted = false;
      };
    }, [])
  );

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>المفضلة</Text>
        <Text style={styles.subtitle}>منتجاتك المحفوظة للرجوع إليها بسرعة</Text>
      </View>

      {loading ? (
        <Text style={styles.emptyText}>جارٍ تحميل المفضلة...</Text>
      ) : favoriteIds.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>لا توجد منتجات مفضلة بعد</Text>
          <Text style={styles.emptyText}>اضغط على القلب في بطاقة المنتج لإضافته هنا.</Text>

          <Pressable style={styles.browseButton} onPress={() => router.push("/(tabs)/home")}>
            <Text style={styles.browseButtonText}>تصفح المنتجات</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.grid}>
          {products.map((product) => (
            <CustomerProductCard
              key={product.id}
              product={product}
              vendors={[]}
              width="48%"
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: theme.spacing[20],
    paddingBottom: theme.spacing[32],
    gap: theme.spacing[16],
    backgroundColor: "#F7FBF8",
  },
  header: {
    alignItems: "flex-end",
    gap: theme.spacing[4],
  },
  title: {
    color: theme.colors.text,
    fontSize: theme.typography.heading.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  subtitle: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    textAlign: "right",
  },
  grid: {
    flexDirection: "row-reverse",
    flexWrap: "wrap",
    gap: theme.spacing[12],
  },
  emptyCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: "#E1ECE6",
    padding: theme.spacing[16],
    gap: theme.spacing[12],
    alignItems: "flex-end",
  },
  emptyTitle: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "900",
    textAlign: "right",
  },
  emptyText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "600",
    textAlign: "right",
    lineHeight: 21,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 999,
    paddingHorizontal: theme.spacing[16],
    paddingVertical: theme.spacing[12],
  },
  browseButtonText: {
    color: "#FFFFFF",
    fontSize: theme.typography.body.sm,
    fontWeight: "900",
  },
});