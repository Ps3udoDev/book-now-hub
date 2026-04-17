"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CartItem } from "@/features/ecommerce/utils";

const EMPTY_CART: CartItem[] = [];

interface EcommerceCartState {
  carts: Record<string, CartItem[]>;
  addItem: (tenantSlug: string, item: Omit<CartItem, "quantity">) => void;
  updateQuantity: (tenantSlug: string, productId: string, quantity: number) => void;
  removeItem: (tenantSlug: string, productId: string) => void;
  clearCart: (tenantSlug: string) => void;
  getCart: (tenantSlug: string) => CartItem[];
}

export const useEcommerceCart = create<EcommerceCartState>()(
  persist(
    (set, get) => ({
      carts: {},
      addItem: (tenantSlug, item) => {
        const currentCart = get().carts[tenantSlug] || [];
        const existingItem = currentCart.find(
          (current) => current.productId === item.productId,
        );

        if (existingItem) {
          set({
            carts: {
              ...get().carts,
              [tenantSlug]: currentCart.map((current) =>
                current.productId === item.productId
                  ? { ...current, quantity: current.quantity + 1 }
                  : current,
              ),
            },
          });
          return;
        }

        set({
          carts: {
            ...get().carts,
            [tenantSlug]: [...currentCart, { ...item, quantity: 1 }],
          },
        });
      },
      updateQuantity: (tenantSlug, productId, quantity) => {
        const currentCart = get().carts[tenantSlug] || [];
        const nextQuantity = Math.max(0, quantity);

        set({
          carts: {
            ...get().carts,
            [tenantSlug]:
              nextQuantity === 0
                ? currentCart.filter((item) => item.productId !== productId)
                : currentCart.map((item) =>
                    item.productId === productId
                      ? { ...item, quantity: nextQuantity }
                      : item,
                  ),
          },
        });
      },
      removeItem: (tenantSlug, productId) => {
        const currentCart = get().carts[tenantSlug] || [];
        set({
          carts: {
            ...get().carts,
            [tenantSlug]: currentCart.filter((item) => item.productId !== productId),
          },
        });
      },
      clearCart: (tenantSlug) => {
        set({
          carts: {
            ...get().carts,
            [tenantSlug]: [],
          },
        });
      },
      getCart: (tenantSlug) => get().carts[tenantSlug] ?? EMPTY_CART,
    }),
    {
      name: "ecommerce-cart-storage",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function selectTenantCartItems(tenantSlug: string) {
  return (state: EcommerceCartState) => state.carts[tenantSlug] ?? EMPTY_CART;
}
