import { Ionicons } from "@expo/vector-icons";
import type { Product, Vendor } from "@medifast/types";
import { theme } from "@medifast/ui";
import { usePathname, useRouter } from "expo-router";
import { memo, useCallback, useMemo, type ComponentProps } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { CatalogImage } from "./CatalogImage";
import { addProductToCart } from "../lib/cart-store";
import { formatCustomerCurrency } from "../lib/customer-orders";

type CustomerProductCardProps = {
  product: Product;
  vendors: Vendor[];
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
};

function CustomerProductCardComponent({
  product,
  vendors,
  width = "100%",
  style,
}: CustomerProductCardProps) {
  const router = useRouter();
  const pathname = usePathname();

  const vendor = useMemo(
    () => vendors.find((candidate) => candidate.id === product.vendor_id) ?? null,
    [product.vendor_id, vendors],
  );

  const handlePress = useCallback(() => {
    router.push({
      pathname: "/product-detail",
      params: { productId: product.id },
    });
  }, [product.id, router]);

  const handleAddToCart = useCallback(
    (event: Parameters<NonNullable<ComponentProps<typeof Pressable>["onPress"]>>[0]) => {
      event.stopPropagation();

      if (product.stock_quantity <= 0) {
        return;
      }

      addProductToCart(product, 1);

      if (pathname !== "/home") {
        router.push("/(tabs)/cart");
      }
    },
    [pathname, product, router],
  );

  return (
    <Pressable style={({ pressed }) => [{ width }, style, pressed ? styles.cardPressed : null]} onPress={handlePress}>
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <CatalogImage
            uri={product.image_url}
            alt={product.name}
            fallbackLabel="منتج"
            containerStyle={styles.imageWrap}
            imageStyle={styles.image}
          />

          <Pressable
            accessibilityRole="button"
            style={[styles.addButton, product.stock_quantity <= 0 ? styles.addButtonDisabled : null]}
            disabled={product.stock_quantity <= 0}
            onPress={handleAddToCart}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>

            <Text style={styles.location} numberOfLines={1}>
              {vendor?.address || "موقع غير محدد"}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.vendor} numberOfLines={1}>
              {vendor?.name || "صيدلية معتمدة"}
            </Text>

            <Text style={styles.price} numberOfLines={1}>
              {formatCustomerCurrency(product.price)}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export const CustomerProductCard = memo(CustomerProductCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E1ECE6",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[12],
    gap: theme.spacing[12],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardPressed: {
    opacity: 0.95,
  },
  imageContainer: {
    position: "relative",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1.08,
    borderRadius: 18,
    backgroundColor: "#F4F8F6",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  addButton: {
    position: "absolute",
    left: theme.spacing[8],
    bottom: theme.spacing[8],
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  addButtonDisabled: {
    opacity: 0.42,
  },
  body: {
    gap: theme.spacing[8],
  },
  row: {
    flexDirection: "row-reverse",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: theme.spacing[8],
  },
  name: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.body.md,
    fontWeight: "900",
    lineHeight: 22,
    textAlign: "right",
  },
  location: {
    maxWidth: "38%",
    color: theme.colors.muted,
    fontSize: theme.typography.caption.sm,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 18,
  },
  vendor: {
    flex: 1,
    color: theme.colors.text,
    fontSize: theme.typography.caption.md,
    fontWeight: "800",
    textAlign: "right",
    lineHeight: 18,
  },
  price: {
    color: theme.colors.primaryDark,
    fontSize: theme.typography.caption.md,
    fontWeight: "900",
    textAlign: "left",
    lineHeight: 18,
  },
});
