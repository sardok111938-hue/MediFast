import { categories, products, vendors, theme } from "@medifast/ui";
import { Card, ListCard, Pill, PrimaryButton, Screen, SearchInput, SectionTitle } from "../src/components/CustomerUI";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useCustomerI18n } from "../src/lib/i18n";

export default function HomeScreen() {
  const router = useRouter();
  const { t, isRTL } = useCustomerI18n();

  return (
    <Screen title="Home" subtitle="Discover nearby pharmacies, essentials, and express medicine delivery.">
      <Card>
        <Text style={[styles.heroTitle, isRTL ? styles.textRight : null]}>{t("Track your orders")}</Text>
        <Text style={[styles.heroText, isRTL ? styles.textRight : null]}>
          {t("Open your customer orders list to check payment status, delivery updates, and live progress.")}
        </Text>
        <PrimaryButton label="View Orders" onPress={() => router.push("/order-history")} />
        <PrimaryButton label="Browse Products" onPress={() => router.push("/product-listing")} variant="secondary" />
      </Card>
      <SearchInput placeholder="Search medicines, vitamins, skincare..." />
      <SectionTitle label="Categories" />
      <View style={styles.categoryWrap}>
        {categories.map((category) => (
          <Pill key={category.id} label={category.name} />
        ))}
      </View>
      <SectionTitle label="Nearby Pharmacies" />
      {vendors.map((vendor) => (
        <ListCard key={vendor.id} title={vendor.name} subtitle={vendor.address} badge={<Pill label={vendor.is_open ? "Open" : "Closed"} />}>
          <Text style={[styles.metaText, isRTL ? styles.textRight : null]}>{`${vendor.eta_minutes} دقيقة • ${vendor.rating} نجوم`}</Text>
        </ListCard>
      ))}
      <SectionTitle label="Trending Products" />
      {products.map((product) => (
        <ListCard key={product.id} title={product.name} subtitle={product.description} badge={product.express ? <Pill label="Express delivery" /> : null}>
          <Text style={[styles.priceText, isRTL ? styles.textRight : null]}>${product.price.toFixed(2)}</Text>
          {product.express ? <Pill label="Express delivery" /> : null}
        </ListCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  heroTitle: {
    fontSize: theme.typography.heading.md,
    fontWeight: "800",
    color: theme.colors.text,
  },
  heroText: {
    color: theme.colors.muted,
    lineHeight: theme.typography.lineHeight.body,
    fontSize: theme.typography.body.md,
  },
  metaText: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
  },
  priceText: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
  },
  categoryWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[8],
  },
  textRight: {
    textAlign: "right",
  },
});
