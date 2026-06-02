import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartItem, CartProductSnapshot, Product } from "@medifast/types";
import { useSyncExternalStore } from "react";

type CartListener = () => void;

const CART_STORAGE_KEY = "medifast-customer-cart-v1";

let cartState: CartItem[] = [];
let hasHydrated = false;

const listeners = new Set<CartListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

async function persistCart() {
  try {
    await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
  } catch (error) {
    console.warn("Failed to persist customer cart", error);
  }
}

function isValidSnapshot(value: unknown): value is CartProductSnapshot {
  if (!value || typeof value !== "object") return false;

  const snapshot = value as Partial<CartProductSnapshot>;
  const price = Number(snapshot.price);

return (
  typeof snapshot.product_id === "string" &&
  typeof snapshot.vendor_id === "string" &&
  typeof snapshot.name === "string" &&
  typeof snapshot.description === "string" &&
  Number.isFinite(price) &&
  typeof snapshot.stock_quantity === "number" &&
  Number.isFinite(snapshot.stock_quantity) &&
  typeof snapshot.is_active === "boolean"
);
}

function isValidCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;

  const item = value as Partial<CartItem>;

  return (
    typeof item.id === "string" &&
    typeof item.product_id === "string" &&
    typeof item.quantity === "number" &&
    Number.isFinite(item.quantity) &&
    item.quantity > 0 &&
    isValidSnapshot(item.snapshot)
  );
}

async function hydrateCart() {
  if (hasHydrated) return;

  hasHydrated = true;

  try {
    const raw = await AsyncStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;

    const validItems = parsed.filter(isValidCartItem);
    
    cartState = validItems;
    emitChange();
    
    if (validItems.length !== parsed.length) {
      void persistCart();
    }

  } catch (error) {
    console.warn("Failed to hydrate customer cart", error);
  }
}

void hydrateCart();

function subscribe(listener: CartListener) {
  listeners.add(listener);
  void hydrateCart();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return cartState;
}

function buildProductSnapshot(product: Product): CartProductSnapshot {
  return {
    product_id: product.id,
    vendor_id: product.vendor_id,
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    price: product.price,
    image_url: product.image_url?.trim() ?? null,
    barcode: product.barcode ?? null,
    stock_quantity: product.stock_quantity,
    is_active: product.is_active,
  };
}

function updateCart(nextState: CartItem[]) {
  cartState = nextState;
  emitChange();
  void persistCart();
}

function updateSnapshotForProduct(product: Product) {
  const snapshot = buildProductSnapshot(product);

  updateCart(
    cartState.map((item) =>
      item.product_id === product.id
        ? {
            ...item,
            snapshot,
          }
        : item
    )
  );
}

export function useCustomerCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addProductToCart(product: Product, quantity = 1) {
  const safeQuantity = Math.max(1, Math.trunc(quantity));
  const snapshot = buildProductSnapshot(product);
  const existingItem = cartState.find((item) => item.product_id === product.id);

  if (existingItem) {
    updateCart(
      cartState.map((item) =>
        item.product_id === product.id
          ? {
              ...item,
              quantity: item.quantity + safeQuantity,
              snapshot,
            }
          : item
      )
    );
    return;
  }

  updateCart([
    ...cartState,
    {
      id: `cart-${product.id}`,
      product_id: product.id,
      quantity: safeQuantity,
      snapshot,
    },
  ]);
}

export function setCartItemQuantity(productId: string, quantity: number) {
  const safeQuantity = Math.max(0, Math.trunc(quantity));

  if (safeQuantity === 0) {
    removeProductFromCart(productId);
    return;
  }

  updateCart(
    cartState.map((item) =>
      item.product_id === productId
        ? {
            ...item,
            quantity: safeQuantity,
          }
        : item
    )
  );
}

export function removeProductFromCart(productId: string) {
  updateCart(cartState.filter((item) => item.product_id !== productId));
}

export function refreshCartItemSnapshot(product: Product) {
  updateSnapshotForProduct(product);
}

export function getCartItemCount(items: CartItem[] = cartState) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(items: CartItem[] = cartState) {
  return items.reduce((sum, item) => sum + item.snapshot.price * item.quantity, 0);
}

export function clearCustomerCart() {
  updateCart([]);
}

export function resetCustomerCart() {
  updateCart([]);
}