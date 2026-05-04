import { cartItems as initialCartItems } from "@medifast/ui";
import type { CartItem, Product } from "@medifast/types";
import { useSyncExternalStore } from "react";

type CartListener = () => void;

let cartState: CartItem[] = initialCartItems.map((item) => ({
  ...item,
  product: { ...item.product },
}));

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

function cloneCart(items: CartItem[]) {
  return items.map((item) => ({
    ...item,
    product: { ...item.product },
  }));
}

export function useCustomerCart() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function addProductToCart(product: Product, quantity = 1) {
  const safeQuantity = Math.max(1, Math.trunc(quantity));
  const existingItem = cartState.find((item) => item.product.id === product.id);

  if (existingItem) {
    cartState = cartState.map((item) =>
      item.product.id === product.id
        ? {
            ...item,
            quantity: item.quantity + safeQuantity,
          }
        : item
    );
  } else {
    cartState = [
      ...cartState,
      {
        id: `cart-${product.id}`,
        product: { ...product },
        quantity: safeQuantity,
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
    item.product.id === productId
      ? {
          ...item,
          quantity: safeQuantity,
        }
      : item
  );

  emitChange();
}

export function removeProductFromCart(productId: string) {
  cartState = cartState.filter((item) => item.product.id !== productId);
  emitChange();
}

export function getCartItemCount(items: CartItem[] = cartState) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export function getCartSubtotal(items: CartItem[] = cartState) {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
}

export function clearCustomerCart() {
  cartState = [];
  emitChange();
}

export function resetCustomerCart() {
  cartState = cloneCart(initialCartItems);
  emitChange();
}
