"use client";

import { useCart } from "@/state/cart";
import type { MenuItem } from "@/lib/db/types";

type Props = {
  item: MenuItem;
  label: string;
  outOfStockLabel: string;
};

export function AddToCartButton({ item, label, outOfStockLabel }: Props) {
  const add = useCart((s) => s.add);
  const open = useCart((s) => s.open);

  if (!item.is_available) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-zinc-300 px-4 py-1.5 text-sm font-medium text-zinc-400 cursor-not-allowed"
      >
        {outOfStockLabel}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        add({
          itemId: item.id,
          slug: item.slug,
          nameEn: item.name_en,
          nameAr: item.name_ar,
          unitHalalas: item.price_halalas,
        });
        open();
      }}
      className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition"
    >
      {label}
    </button>
  );
}
