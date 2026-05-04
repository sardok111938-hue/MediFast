import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Image, StyleSheet, Text, View } from "react-native";
import { theme } from "@medifast/ui";
import { Card, EmptyCard, HelperText, PrimaryButton, QuantityStepper, Screen, SectionTitle } from "../src/components/CustomerUI";
import {
  getCartItemCount,
  getCartSubtotal,
  removeProductFromCart,
  setCartItemQuantity,
  useCustomerCart,
} from "../src/lib/cart-store";
import { formatCustomerCurrency } from "../src/lib/customer-orders";

export default function CartScreen() {
  const router = useRouter();
  const cartItems = useCustomerCart();
  const subtotal = getCartSubtotal(cartItems);
  const itemCount = getCartItemCount(cartItems);
  const hasItems = cartItems.length > 0;
  const recommendedVendor = useMemo(() => cartItems[0]?.product.vendor_id ?? null, [cartItems]);

  return (
    <Screen title="Cart" subtitle="Review your items, adjust quantities, and head to checkout when you are ready.">
      <SectionTitle label="Your basket" />
      {!hasItems ? (
        <EmptyCard
          title="Your cart is empty"
          message="Add products from the pharmacy catalog before proceeding to checkout."
          action={<PrimaryButton label="Browse products" onPress={() => router.push("/product-listing")} />}
        />
      ) : (
        cartItems.map((item) => (
          <Card key={item.id} style={styles.itemCard}>
            <View style={styles.itemRow}>
              <Image source={{ uri: item.product.image_url }} style={styles.itemImage} />
              <View style={styles.itemCopy}>
                <Text style={styles.itemName}>{item.product.name}</Text>
                <Text style={styles.itemDescription}>{item.product.description}</Text>
                <Text style={styles.itemPrice}>{formatCustomerCurrency(item.product.price)}</Text>
              </View>
            </View>

            <View style={styles.itemFooter}>
              <QuantityStepper
                value={item.quantity}
                onIncrement={() => setCartItemQuantity(item.product.id, item.quantity + 1)}
                onDecrement={() => setCartItemQuantity(item.product.id, item.quantity - 1)}
                disableIncrement={item.quantity >= item.product.stock_quantity}
                disableDecrement={item.quantity <= 1}
              />
              <Text style={styles.itemSubtotal}>{formatCustomerCurrency(item.quantity * item.product.price)}</Text>
            </View>

            <PrimaryButton label="Remove item" variant="ghost" onPress={() => removeProductFromCart(item.product.id)} />
          </Card>
        ))
      )}

      <Card style={styles.summaryCard}>
        <SectionTitle label="Order summary" />
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Items</Text>
          <Text style={styles.summaryValue}>{itemCount}</Text>
        </View>
        <View style={styles.summaryBlock}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>{formatCustomerCurrency(subtotal)}</Text>
        </View>
        <HelperText tone="info">
          {recommendedVendor ? "Checkout currently supports one pharmacy order at a time." : "Add a few essentials to continue."}
        </HelperText>
        <PrimaryButton label="Proceed to checkout" onPress={() => router.push("/checkout")} disabled={!hasItems} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    gap: theme.spacing[16],
  },
  itemRow: {
    flexDirection: "row",
    gap: theme.spacing[12],
  },
  itemImage: {
    width: 88,
    height: 88,
    borderRadius: theme.radius.md,
    backgroundColor: "#DCEBDF",
  },
  itemCopy: {
    flex: 1,
    gap: 6,
  },
  itemName: {
    color: theme.colors.text,
    fontWeight: "800",
    fontSize: theme.typography.heading.md,
  },
  itemDescription: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    lineHeight: theme.typography.lineHeight.compact,
  },
  itemPrice: {
    color: theme.colors.primaryDark,
    fontWeight: "800",
    fontSize: theme.typography.body.md,
  },
  itemFooter: {
    gap: 10,
  },
  itemSubtotal: {
    color: theme.colors.text,
    fontWeight: "700",
    fontSize: theme.typography.body.md,
  },
  summaryCard: {
    gap: theme.spacing[16],
  },
  summaryBlock: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: theme.typography.body.sm,
    fontWeight: "700",
  },
  summaryValue: {
    color: theme.colors.text,
    fontSize: theme.typography.body.lg,
    fontWeight: "800",
  },
});
