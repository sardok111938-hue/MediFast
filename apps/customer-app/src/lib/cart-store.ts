import type { CartItem, CartProductSnapshot, Product } from "@medifast/types";
import { useSyncExternalStore } from "react";

type CartListener = () => void;

let cartState: CartItem[] = [];

const listeners = new Set<CartListener>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: CartListener) {
  listeners.add(listener);
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
    image_url: product.image_url,
    barcode: product.barcode ?? null,
    stock_quantity: product.stock_quantity,
    is_active: product.is_active,
  };
}

function updateSnapshotForProduct(product: Product) {
  const snapshot = buildProductSnapshot(product);

  cartState = cartState.map((item) =>
    item.product_id === product.id
      ? {
          ...item,
          snapshot,
        }
      : item
  );

  emitChange();
}

export function useCustomerCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addProductToCart(product: Product, quantity = 1) {
  const safeQuantity = Math.max(1, Math.trunc(quantity));
  const snapshot = buildProductSnapshot(product);
  const existingItem = cartState.find((item) => item.product_id === product.id);

  if (existingItem) {
    cartState = cartState.map((item) =>
      item.product_id === product.id
        ? {
            ...item,
            quantity: item.quantity + safeQuantity,
            snapshot,
          }
        : item
    );
  } else {
    cartState = [
      ...cartState,
      {
        id: `cart-${product.id}`,
        product_id: product.id,
        quantity: safeQuantity,
        snapshot,
      },
    ];
  }

  emitChange();
}

export function setCartItemQuantity(productId: string, quantity: number) {
  const safeQuantity = Math.max(0, Math.trunc(quantity));

  if (safeQuantity === 0) {
    removeProductFromCart(productId);
    return;
  }

  cartState = cartState.map((item) =>
    item.product_id === productId
      ? {
          ...item,
          quantity: safeQuantity,
        }
      : item
  );

  emitChange();
}

export function removeProductFromCart(productId: string) {
  cartState = cartState.filter((item) => item.product_id !== productId);
  emitChange();
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
  cartState = [];
  emitChange();
}

export function resetCustomerCart() {
  cartState = [];
  emitChange();
}
