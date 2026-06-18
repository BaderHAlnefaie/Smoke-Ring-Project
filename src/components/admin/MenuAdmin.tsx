"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "./Toggle";
import { MenuItemModal } from "./MenuItemModal";
import { setItemAvailable, setItemPrice } from "@/app/[lang]/admin/actions";
import { FoodIcon, iconForItem, CHIP_PALETTE } from "@/components/icons/FoodIcon";
import { UiIcon } from "@/components/icons/UiIcon";
import type { Category, MenuItem } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  categories: Category[];
  items: MenuItem[];
  lang: Locale;
  dict: Dictionary;
};

export function MenuAdmin({ categories, items, lang, dict }: Props) {
  const [modal, setModal] = useState<MenuItem | "new" | null>(null);
  const chipFor = (catId: number) => {
    const i = Math.max(0, categories.findIndex((c) => c.id === catId));
    return CHIP_PALETTE[i % CHIP_PALETTE.length];
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setModal("new")}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-cream"
          style={{ background: "#c2622c" }}
        >
          <UiIcon name="plus" size={17} strokeWidth={2} />
          {dict.admin.addItem}
        </button>
      </div>

      <div className="space-y-[26px]">
        {categories.map((cat) => {
          const catItems = items.filter((i) => i.category_id === cat.id);
          if (catItems.length === 0) return null;
          return (
            <section key={cat.id}>
              <div className="mb-2.5 flex items-center gap-2.5">
                <h2 className="font-serif text-[21px]">{lang === "ar" ? cat.name_ar : cat.name_en}</h2>
                <span className="text-xs" style={{ color: "#a99b86" }}>{catItems.length}</span>
              </div>
              <div className="overflow-hidden rounded-[18px] border" style={{ background: "#fffefb", borderColor: "#ece1cc" }}>
                {catItems.map((item) => (
                  <MenuRow
                    key={item.id}
                    item={item}
                    chip={chipFor(item.category_id)}
                    lang={lang}
                    dict={dict}
                    onEdit={() => setModal(item)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {modal && (
        <MenuItemModal
          item={modal === "new" ? null : modal}
          categories={categories}
          lang={lang}
          dict={dict}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function MenuRow({
  item,
  chip,
  lang,
  dict,
  onEdit,
}: {
  item: MenuItem;
  chip: { bg: string; color: string };
  lang: Locale;
  dict: Dictionary;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [price, setPrice] = useState((item.price_halalas / 100).toFixed(2));
  const a = dict.admin;
  const name = lang === "ar" ? item.name_ar : item.name_en;
  const ingredients = lang === "ar" ? item.description_ar : item.description_en;

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const savePrice = () => {
    const v = parseFloat(price);
    if (Number.isFinite(v) && v > 0 && Math.round(v * 100) !== item.price_halalas) {
      run(() => setItemPrice(item.id, v, lang));
    } else {
      setPrice((item.price_halalas / 100).toFixed(2));
    }
  };

  return (
    <div className="flex items-center gap-4 px-5 py-[15px]" style={{ borderBottom: "1px solid #f1e8d6" }}>
      <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px]" style={{ background: chip.bg, color: chip.color }}>
        <FoodIcon name={iconForItem(item.slug, item.name_en)} size={23} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[15.5px] font-semibold">{name}</span>
          {!item.is_available && (
            <span className="flex-none rounded-md px-2 py-0.5 text-[11px] font-bold uppercase" style={{ background: "#f6e2dc", color: "#9c3b22" }}>
              {a.soldOut}
            </span>
          )}
        </div>
        {ingredients && (
          <div className="mt-0.5 truncate text-[12.5px]" style={{ color: "#8a7c6b", maxWidth: 360 }}>{ingredients}</div>
        )}
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onBlur={savePrice}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
          type="number"
          step="0.01"
          min="0.01"
          disabled={pending}
          aria-label={a.priceLabel}
          className="w-20 rounded-lg border bg-transparent px-2 py-1.5 text-end text-sm tabular-nums"
          style={{ borderColor: "#e0d4bd" }}
        />
        <span className="text-xs" style={{ color: "#a99b86" }}>{dict.common.currency}</span>
      </div>
      <Toggle
        on={item.is_available}
        disabled={pending}
        onClick={() => run(() => setItemAvailable(item.id, !item.is_available, lang))}
        label={a.available}
      />
      <button
        type="button"
        onClick={onEdit}
        title={a.editItem}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border"
        style={{ borderColor: "#e2d6bf", background: "#faf3e4", color: "#8a7c6b" }}
      >
        <UiIcon name="pencil" size={16} />
      </button>
    </div>
  );
}
