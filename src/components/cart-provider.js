"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

const CART_STORAGE_KEY = "caftan-cart";
const EMPTY_CART = [];
const CartContext = createContext(null);
const cartListeners = new Set();
const noopSubscribe = () => () => {};
let cartSnapshot = EMPTY_CART;
let hasLoadedSnapshot = false;

function parseStoredCart(storedCart) {
  if (!storedCart) {
    return EMPTY_CART;
  }

  try {
    const parsedCart = JSON.parse(storedCart);

    return Array.isArray(parsedCart) ? parsedCart : EMPTY_CART;
  } catch {
    return EMPTY_CART;
  }
}

function loadCartSnapshot() {
  if (typeof window === "undefined") {
    return EMPTY_CART;
  }

  if (!hasLoadedSnapshot) {
    cartSnapshot = parseStoredCart(
      window.localStorage.getItem(CART_STORAGE_KEY),
    );
    hasLoadedSnapshot = true;
  }

  return cartSnapshot;
}

function getSnapshot() {
  return loadCartSnapshot();
}

function getServerSnapshot() {
  return EMPTY_CART;
}

function notifyCartListeners() {
  cartListeners.forEach((listener) => listener());
}

function subscribe(listener) {
  cartListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      cartListeners.delete(listener);
    };
  }

  const handleStorage = (event) => {
    if (event.key === CART_STORAGE_KEY) {
      cartSnapshot = parseStoredCart(event.newValue);
      hasLoadedSnapshot = true;
      listener();
    }
  };

  window.addEventListener("storage", handleStorage);

  return () => {
    cartListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function writeStoredCart(items) {
  if (typeof window === "undefined") {
    return;
  }

  cartSnapshot = items.length ? items : EMPTY_CART;
  hasLoadedSnapshot = true;
  window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartSnapshot));
  notifyCartListeners();
}

function createCartItemId({ slug, size, color }) {
  return `${slug}::${size}::${color}`;
}

export function CartProvider({ children }) {
  const items = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hasHydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  const addItem = (item) => {
    const nextQuantity = Math.max(1, item.quantity ?? 1);
    const cartItemId = createCartItemId(item);
    const currentItems = getSnapshot();
    const existingItem = currentItems.find(
      (currentItem) => currentItem.cartItemId === cartItemId,
    );

    if (existingItem) {
      writeStoredCart(
        currentItems.map((currentItem) =>
          currentItem.cartItemId === cartItemId
            ? {
                ...currentItem,
                quantity: currentItem.quantity + nextQuantity,
              }
            : currentItem,
        ),
      );
      return;
    }

    writeStoredCart([
      ...currentItems,
      {
        cartItemId,
        variantId: item.variantId,
        productId: item.productId,
        slug: item.slug,
        categorySlug: item.categorySlug,
        name: item.name,
        price: item.price,
        image: item.image,
        size: item.size,
        color: item.color,
        quantity: nextQuantity,
      },
    ]);
  };

  const updateItemQuantity = (cartItemId, quantity) => {
    writeStoredCart(
      getSnapshot().map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              quantity: Math.max(1, quantity),
            }
          : item,
      ),
    );
  };

  const removeItem = (cartItemId) => {
    writeStoredCart(
      getSnapshot().filter((item) => item.cartItemId !== cartItemId),
    );
  };

  const clearCart = () => {
    writeStoredCart(EMPTY_CART);
  };

  const totalQuantity = items.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0,
  );
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0,
  );

  return (
    <CartContext.Provider
      value={{
        items,
        hasHydrated,
        addItem,
        updateItemQuantity,
        removeItem,
        clearCart,
        totalQuantity,
        subtotal,
      }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used within a CartProvider.");
  }

  return context;
}
