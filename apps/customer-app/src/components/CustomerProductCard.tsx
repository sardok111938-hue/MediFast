import { Ionicons } from "@expo/vector-icons";
import type { Product } from "@medifast/types";
import { theme } from "@medifast/ui";
import { usePathname, useRouter } from "expo-router";
import { memo, useCallback, type ComponentProps } from "react";
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
  <Text style={styles.name} numberOfLines={2}>
    {product.name}
  </Text>

  <Text style={styles.price} numberOfLines={1}>
    {formatCustomerCurrency(product.price)}
  </Text>
</View>
      </View>
    </Pressable>
  );
}

export const CustomerProductCard = memo(CustomerProductCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E1ECE6",
    backgroundColor: theme.colors.surface,
    padding: theme.spacing[8],
    gap: theme.spacing[8],
    shadowColor: theme.shadows.card.shadowColor,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.95,
  },
  imageContainer: {
    position: "relative",
  },
  imageWrap: {
  width: "100%",
  height: 96,
  borderRadius: 14,
  backgroundColor: "#F4F8F6",
},
  image: {
    width: "100%",
    height: "100%",
  },
  addButton: {
  position: "absolute",
  left: theme.spacing[6],
  bottom: theme.spacing[6],
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: theme.colors.primary,
  alignItems: "center",
  justifyContent: "center",
},
  addButtonDisabled: {
    opacity: 0.42,
  },
  body: {
    gap: 6,
  },
  name: {
  color: theme.colors.text,
  fontSize: 12,
  fontWeight: "900",
  lineHeight: 16,
  textAlign: "right",
  minHeight: 32,
},
price: {
  color: theme.colors.primaryDark,
  fontSize: 13,
  fontWeight: "900",
  textAlign: "right",
  lineHeight: 16,
},
});
