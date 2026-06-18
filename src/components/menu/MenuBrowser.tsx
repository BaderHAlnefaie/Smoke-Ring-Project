"use client";

import { useState } from "react";
import type { Category, MenuItem } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { formatHalalas } from "@/lib/money";
import { useCart } from "@/state/cart";
import { FoodIcon, iconForItem, CHIP_PALETTE } from "@/components/icons/FoodIcon";

type Props = {
  categories: Category[];
  items: MenuItem[];
  lang: Locale;
  dict: Dictionary;
};

export function MenuBrowser({ categories, items, lang, dict }: Props) {
  const [active, setActive] = useState<number | "all">("all");

  if (items.length === 0) {
    return <p className="py-16 text-center text-sm text-faint">{dict.menu.empty}</p>;
  }

  const chipFor = (categoryId: number) => {
    const idx = Math.max(0, categories.findIndex((c) => c.id === categoryId));
    return CHIP_PALETTE[idx % CHIP_PALETTE.length];
  };
  const visible = categories.filter((c) => active === "all" || c.id === active);

  return (
    <div>
      {/* category tabs */}
      <div className="sticky top-[64px] z-20 -mx-1 flex flex-wrap gap-2 bg-cream px-1 py-3">
        <Tab active={active === "all"} onClick={() => setActive("all")}>
          {dict.menu.all}
        </Tab>
        {categories.map((c) => (
          <Tab key={c.id} active={active === c.id} onClick={() => setActive(c.id)}>
            {lang === "ar" ? c.name_ar : c.name_en}
          </Tab>
        ))}
      </div>

      {visible.map((category) => {
        const catItems = items.filter((i) => i.category_id === category.id);
        if (catItems.length === 0) return null;
        const name = lang === "ar" ? category.name_ar : category.name_en;
        return (
          <section key={category.id} className="mt-4">
            <div className="mb-1 flex items-baseline justify-between">
              <h2 className="font-serif text-2xl">{name}</h2>
              <span className="text-sm text-faint tabular-nums">{catItems.length}</span>
            </div>
            <div>
              {catItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  lang={lang}
                  dict={dict}
                  chip={chipFor(item.category_id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "border-ember bg-ember text-cream"
          : "border-line bg-panel text-ink-soft hover:border-ember/40"
      }`}
    >
      {children}
    </button>
  );
}

function ItemRow({
  item,
  lang,
  dict,
  chip,
}: {
  item: MenuItem;
  lang: Locale;
  dict: Dictionary;
  chip: { bg: string; color: string };
}) {
  const line = useCart((s) => s.items.find((i) => i.itemId === item.id));
  const add = useCart((s) => s.add);
  const setQty = useCart((s) => s.setQty);
  const qty = line?.qty ?? 0;

  const name = lang === "ar" ? item.name_ar : item.name_en;
  const description = lang === "ar" ? item.description_ar : item.description_en;

  const addOne = () =>
    add({
      itemId: item.id,
      slug: item.slug,
      nameEn: item.name_en,
      nameAr: item.name_ar,
      unitHalalas: item.price_halalas,
    });

  return (
    <div className="flex items-center gap-4 border-b border-ink/[.08] py-[18px]">
      <div
        className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-[15px]"
        style={{ background: chip.bg, color: chip.color }}
      >
        <FoodIcon name={iconForItem(item.slug, item.name_en)} size={25} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[17px] font-semibold">{name}</span>
          <span className="text-[15px] font-semibold tabular-nums text-ink">
            {formatHalalas(item.price_halalas, lang)}
          </span>
        </div>
        {description && (
          <div className="mt-1 text-[13.5px] leading-snug text-muted">{description}</div>
        )}
      </div>

      <div className="flex-none">
        {!item.is_available ? (
          <span className="rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-faint">
            {dict.menu.outOfStock}
          </span>
        ) : qty === 0 ? (
          <button
            type="button"
            onClick={addOne}
            className="flex items-center gap-1.5 rounded-xl border border-ember bg-panel px-4 py-2.5 text-sm font-semibold text-ember transition hover:bg-ember-soft"
          >
            <span className="text-lg leading-none">+</span>
            {dict.menu.add}
          </button>
        ) : (
          <div className="flex items-center overflow-hidden rounded-xl border border-ember bg-ember-soft">
            <button
              type="button"
              onClick={() => setQty(item.id, qty - 1)}
              aria-label={`${dict.cart.quantity} -`}
              className="h-10 w-9 text-xl text-ember"
            >
              −
            </button>
            <span className="min-w-6 text-center text-[15px] font-bold tabular-nums text-ink">
              {qty}
            </span>
            <button
              type="button"
              onClick={addOne}
              aria-label={`${dict.cart.quantity} +`}
              className="h-10 w-9 text-xl text-ember"
            >
              +
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
