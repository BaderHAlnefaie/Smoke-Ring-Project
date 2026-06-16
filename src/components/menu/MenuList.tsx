import Image from "next/image";
import type { Category, MenuItem } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";
import { formatHalalas } from "@/lib/money";
import { AddToCartButton } from "./AddToCartButton";

type Props = {
  categories: Category[];
  items: MenuItem[];
  lang: Locale;
  dict: Dictionary;
};

export function MenuList({ categories, items, lang, dict }: Props) {
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        {dict.menu.empty}
      </p>
    );
  }

  const itemsByCategory = new Map<number, MenuItem[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  }

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryItems = itemsByCategory.get(category.id) ?? [];
        if (categoryItems.length === 0) return null;
        const categoryName = lang === "ar" ? category.name_ar : category.name_en;
        return (
          <section key={category.id}>
            <h2 className="mb-3 text-xl font-semibold tracking-tight">
              {categoryName}
            </h2>
            <ul className="divide-y divide-black/[.06] dark:divide-white/[.08] rounded-lg border border-black/[.06] dark:border-white/[.08] bg-white dark:bg-zinc-950">
              {categoryItems.map((item) => {
                const name = lang === "ar" ? item.name_ar : item.name_en;
                const description =
                  lang === "ar" ? item.description_ar : item.description_en;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    {item.image_url && (
                      <Image
                        src={item.image_url}
                        alt={name}
                        width={64}
                        height={64}
                        className="h-16 w-16 shrink-0 rounded-md object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{name}</p>
                      {description && (
                        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                          {description}
                        </p>
                      )}
                      <p className="mt-1 text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
                        {formatHalalas(item.price_halalas, lang)}
                      </p>
                    </div>
                    <AddToCartButton
                      item={item}
                      label={dict.menu.addToCart}
                      outOfStockLabel={dict.menu.outOfStock}
                    />
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
