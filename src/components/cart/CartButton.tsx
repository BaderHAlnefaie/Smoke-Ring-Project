"use client";

import { ShoppingBag } from "lucide-react";
import { selectTotalQty, useCart } from "@/state/cart";
import { useHydrated } from "@/lib/use-hydrated";

export function CartButton() {
  const mounted = useHydrated();

  const open = useCart((s) => s.open);
  const count = useCart(selectTotalQty);

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open cart"
      className="relative inline-flex items-center justify-center rounded-full p-2 text-ink hover:bg-ember-soft transition"
    >
      <ShoppingBag className="h-5 w-5" />
      {mounted && count > 0 ? (
        <span className="absolute -top-0.5 -end-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ember px-1 text-xs font-semibold text-cream">
          {count}
        </span>
      ) : null}
    </button>
  );
}
