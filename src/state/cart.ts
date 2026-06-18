"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type CartItem = {
  itemId: number;
  slug: string;
  nameEn: string;
  nameAr: string;
  unitHalalas: number;
  qty: number;
  notes?: string;
};

export type PickupType = "asap" | "scheduled";

type CartState = {
  items: CartItem[];
  isOpen: boolean;
  pickupType: PickupType;
  /** Local datetime-local string (e.g. "2026-06-16T18:30"); empty when ASAP. */
  scheduledFor: string;
  open: () => void;
  close: () => void;
  add: (item: Omit<CartItem, "qty">) => void;
  setQty: (itemId: number, qty: number) => void;
  setNotes: (itemId: number, notes: string) => void;
  remove: (itemId: number) => void;
  setPickup: (pickupType: PickupType, scheduledFor?: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      pickupType: "asap",
      scheduledFor: "",
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      add: (item) =>
        set((s) => {
          const existing = s.items.find((i) => i.itemId === item.itemId);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.itemId === item.itemId ? { ...i, qty: i.qty + 1 } : i,
              ),
            };
          }
          return { items: [...s.items, { ...item, qty: 1 }] };
        }),
      setQty: (itemId, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.itemId !== itemId)
              : s.items.map((i) =>
                  i.itemId === itemId ? { ...i, qty } : i,
                ),
        })),
      setNotes: (itemId, notes) =>
        set((s) => ({
          items: s.items.map((i) =>
            i.itemId === itemId ? { ...i, notes: notes.slice(0, 280) } : i,
          ),
        })),
      remove: (itemId) =>
        set((s) => ({ items: s.items.filter((i) => i.itemId !== itemId) })),
      setPickup: (pickupType, scheduledFor) =>
        set({ pickupType, scheduledFor: scheduledFor ?? "" }),
      clear: () => set({ items: [], pickupType: "asap", scheduledFor: "" }),
    }),
    {
      name: "smoke-ring-cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        items: s.items,
        pickupType: s.pickupType,
        scheduledFor: s.scheduledFor,
      }),
    },
  ),
);

export function selectSubtotalHalalas(s: CartState): number {
  return s.items.reduce((sum, i) => sum + i.unitHalalas * i.qty, 0);
}

export function selectTotalQty(s: CartState): number {
  return s.items.reduce((sum, i) => sum + i.qty, 0);
}
