"use client";

import { create } from "zustand";

export type CartItem = {
  key: string;                 // معرّف محلي مؤقت
  type: "catalog" | "manual";
  productId?: string;
  manualName?: string;
  displayedPrice?: number;     // للعرض فقط، غير نهائي (القسم 17)
  quantity: number;
  unitId: string;
  unitName: string;
  comment?: string;
};

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (key: string) => void;
  updateQuantity: (key: string, quantity: number) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (key) => set((state) => ({ items: state.items.filter((i) => i.key !== key) })),
  updateQuantity: (key, quantity) =>
    set((state) => ({
      items: state.items.map((i) => (i.key === key ? { ...i, quantity } : i))
    })),
  clear: () => set({ items: [] })
}));
