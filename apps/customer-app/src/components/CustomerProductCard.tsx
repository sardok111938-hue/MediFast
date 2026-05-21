import { Ionicons } from "@expo/vector-icons";
import type { Product, Vendor } from "@medifast/types";
import { theme } from "@medifast/ui";
import { useRouter } from "expo-router";
import { memo, useCallback, useEffect, useState } from "react";
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
import { formatCustomerCurrency } from "../features/orders/customer-orders";
import { isFavoriteProduct, toggleFavoriteProduct } from "../features/favorites/favorites";

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

  const [added, setAdded] = useState(false);
  const [favorite, setFavorite] = useState(false);

  useEffect(() => {
    let mounted = true;

    void isFavoriteProduct(product.id).then((value) => {
      if (mounted) {
        setFavorite(value);
      }
    });

    return () => {
      mounted = false;
    };
  }, [product.id]);

  const handlePress = useCallback(() => {
    router.push({
      pathname: "/product-detail",
      params: { productId: product.id },
    });
  }, [product.id, router]);

  const handleAddToCart = useCallback(() => {
    if (product.stock_quantity <= 0) {
      return;
    }

    addProductToCart(product, 1);
    setAdded(true);

    setTimeout(() => {
      setAdded(false);
    }, 900);
  }, [product]);

  const handleToggleFavorite = useCallback(async () => {
    const result = await toggleFavoriteProduct(product.id);
    setFavorite(result.isFavorite);
  }, [product.id]);

  return (
    <View style={[{ width }, style]}>
      <View style={styles.card}>
        <Pressable style={styles.cardPressArea} onPress={handlePress}>
          <View style={styles.imageContainer}>
            <CatalogImage
              uri={product.image_url}
              alt={product.name}
              fallbackLabel="منتج"
              containerStyle={styles.imageWrap}
              imageStyle={styles.image}
              resizeMode="contain"
            />
          </View>

          <View style={styles.body}>
            <Text style={styles.name} numberOfLines={2}>
              {product.name}
            </Text>

            <Text style={styles.price} numberOfLines={1}>
              {formatCustomerCurrency(product.price)}
            </Text>
          </View>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          style={styles.favoriteButton}
          onPress={handleToggleFavorite}
        >
          <Ionicons
            name={favorite ? "heart" : "heart-outline"}
            size={17}
            color={favorite ? "#E5484D" : theme.colors.muted}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          hitSlop={10}
          style={[styles.addButton, product.stock_quantity <= 0 ? styles.addButtonDisabled : null]}
          disabled={product.stock_quantity <= 0}
          onPress={handleAddToCart}
        >
          <Ionicons name={added ? "checkmark" : "add"} size={18} color="#FFFFFF" />
        </Pressable>
      </View>
    </View>
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
    position: "relative",
  },
  cardPressed: {
    opacity: 0.95,
  },
  cardPressArea: {
    gap: theme.spacing[8],
  },
  imageContainer: {
    position: "relative",
  },
  imageWrap: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 18,
    backgroundColor: "#F7FAF8",
    padding: 10,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  image: {
    width: "92%",
    height: "92%",
  },
  favoriteButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 20,

    width: 28,
    height: 28,
    borderRadius: 999,

    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "#E5EEE9",

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  addButton: {
    position: "absolute",
    left: 10,
    bottom: 10,
    zIndex: 20,

    width: 26,
    height: 26,
    borderRadius: 17,

    backgroundColor: theme.colors.primary,

    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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