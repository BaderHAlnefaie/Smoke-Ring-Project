"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UiIcon } from "@/components/icons/UiIcon";
import { Toggle } from "./Toggle";
import {
  createInventoryItemAction,
  updateInventoryItemAction,
  deleteInventoryItemAction,
  receiveStockAction,
  setRecipeLinkAction,
  removeRecipeLinkAction,
  type InventoryDraft,
} from "@/app/[lang]/admin/inventory/actions";
import { formatUnits, stockLevel, type StockLevel } from "@/lib/inventory";
import type { Category, InventoryItem, MenuItem, MenuItemIngredient } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  inventory: InventoryItem[];
  items: MenuItem[];
  categories: Category[];
  links: MenuItemIngredient[];
  lang: Locale;
  dict: Dictionary;
};

const EMBER = "#c2622c";
const LINE = "#ece1cc";
const PANEL = "#fffefb";
const FAINT = "#a99b86";
const INKSOFT = "#8a7c6b";

const LEVEL_STYLE: Record<StockLevel, { bg: string; color: string }> = {
  ok: { bg: "#eef2e6", color: "#4f6b3a" },
  low: { bg: "#fbeacb", color: "#9a6a17" },
  out: { bg: "#f6e2dc", color: "#9c3b22" },
};

export function InventoryManager({ inventory, items, categories, links, lang, dict }: Props) {
  const t = dict.inventory;
  const [tab, setTab] = useState<"stock" | "recipes">("stock");

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <TabButton active={tab === "stock"} onClick={() => setTab("stock")} label={t.stockTab} />
        <TabButton active={tab === "recipes"} onClick={() => setTab("recipes")} label={t.recipesTab} />
      </div>
      {tab === "stock" ? (
        <StockTab inventory={inventory} lang={lang} dict={dict} />
      ) : (
        <RecipesTab
          inventory={inventory}
          items={items}
          categories={categories}
          links={links}
          lang={lang}
          dict={dict}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl px-4 py-2 text-sm font-semibold"
      style={active ? { background: EMBER, color: "#fbf5e9" } : { color: INKSOFT, background: "#faf3e4" }}
    >
      {label}
    </button>
  );
}

/* ------------------------------- Stock tab ------------------------------- */

function StockTab({ inventory, lang, dict }: { inventory: InventoryItem[]; lang: Locale; dict: Dictionary }) {
  const t = dict.inventory;
  const [editing, setEditing] = useState<InventoryItem | "new" | null>(null);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-cream"
          style={{ background: EMBER }}
        >
          <UiIcon name="plus" size={17} strokeWidth={2} />
          {t.addItem}
        </button>
      </div>

      {editing && (
        <InventoryForm
          item={editing === "new" ? null : editing}
          lang={lang}
          dict={dict}
          onClose={() => setEditing(null)}
        />
      )}

      {inventory.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: FAINT }}>
          {t.emptyStock}
        </p>
      ) : (
        <div className="overflow-hidden rounded-[18px] border" style={{ background: PANEL, borderColor: LINE }}>
          {inventory.map((item) => (
            <StockRow key={item.id} item={item} lang={lang} dict={dict} onEdit={() => setEditing(item)} />
          ))}
        </div>
      )}
    </div>
  );
}

function StockRow({
  item,
  lang,
  dict,
  onEdit,
}: {
  item: InventoryItem;
  lang: Locale;
  dict: Dictionary;
  onEdit: () => void;
}) {
  const t = dict.inventory;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [units, setUnits] = useState("");

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const level = stockLevel(item.stock_servings, item.low_stock_servings);
  const ls = LEVEL_STYLE[level];
  const levelLabel = level === "out" ? t.out : level === "low" ? t.low : t.ok;
  const name = lang === "ar" ? item.name_ar : item.name_en;
  const unitLabel = lang === "ar" ? item.unit_label_ar : item.unit_label_en;

  const receive = () => {
    const u = parseInt(units, 10);
    if (Number.isInteger(u) && u > 0) run(() => receiveStockAction(item.id, u, lang).then(() => setUnits("")));
  };

  return (
    <div className="flex items-center gap-4 px-5 py-[15px]" style={{ borderBottom: `1px solid #f1e8d6` }}>
      <div className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-[13px]" style={{ background: "#faf3e4", color: EMBER }}>
        <UiIcon name="box" size={22} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5">
          <span className="truncate text-[15.5px] font-semibold">{name}</span>
          <span className="flex-none rounded-md px-2 py-0.5 text-[11px] font-bold uppercase" style={{ background: ls.bg, color: ls.color }}>
            {levelLabel}
          </span>
        </div>
        <div className="mt-0.5 text-[12.5px]" style={{ color: INKSOFT }}>
          {formatUnits(item.stock_servings, item.servings_per_unit)} {unitLabel} {t.remaining}
          <span style={{ color: FAINT }}>
            {" · "}
            {item.stock_servings} {t.servings} {" · "} 1 {unitLabel} = {item.servings_per_unit} {t.servings}
          </span>
        </div>
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <input
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") receive();
          }}
          type="number"
          min="1"
          step="1"
          disabled={pending}
          placeholder={t.receivePrompt}
          aria-label={t.receivePrompt}
          className="w-28 rounded-lg border bg-transparent px-2 py-1.5 text-sm"
          style={{ borderColor: "#e0d4bd" }}
        />
        <button
          type="button"
          onClick={receive}
          disabled={pending || !units}
          className="rounded-lg px-3 py-1.5 text-sm font-semibold disabled:opacity-50"
          style={{ background: "#eef2e6", color: "#4f6b3a" }}
        >
          {t.receive}
        </button>
      </div>
      <button
        type="button"
        onClick={onEdit}
        title={t.edit}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border"
        style={{ borderColor: "#e2d6bf", background: "#faf3e4", color: INKSOFT }}
      >
        <UiIcon name="pencil" size={16} />
      </button>
      <button
        type="button"
        onClick={() => {
          if (confirm(t.deleteConfirm)) run(() => deleteInventoryItemAction(item.id, lang));
        }}
        disabled={pending}
        title={t.delete}
        className="flex h-9 w-9 flex-none items-center justify-center rounded-[10px] border disabled:opacity-50"
        style={{ borderColor: "#eccfc6", background: "#f9ece8", color: "#9c3b22" }}
      >
        ✕
      </button>
    </div>
  );
}

function InventoryForm({
  item,
  lang,
  dict,
  onClose,
}: {
  item: InventoryItem | null;
  lang: Locale;
  dict: Dictionary;
  onClose: () => void;
}) {
  const t = dict.inventory;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [f, setF] = useState<InventoryDraft>({
    name_en: item?.name_en ?? "",
    name_ar: item?.name_ar ?? "",
    unit_label_en: item?.unit_label_en ?? "",
    unit_label_ar: item?.unit_label_ar ?? "",
    servings_per_unit: item?.servings_per_unit ?? 1,
    low_stock_servings: item?.low_stock_servings ?? 0,
    is_active: item?.is_active ?? true,
  });
  const set = <K extends keyof InventoryDraft>(k: K, v: InventoryDraft[K]) => setF((p) => ({ ...p, [k]: v }));

  const valid = f.name_en.trim().length > 0 && Number(f.servings_per_unit) >= 1;

  const save = () =>
    start(async () => {
      const res = item
        ? await updateInventoryItemAction(item.id, f, lang)
        : await createInventoryItemAction(f, lang);
      if (res.ok) {
        router.refresh();
        onClose();
      }
    });

  return (
    <div className="mb-4 rounded-[18px] border p-5" style={{ background: PANEL, borderColor: LINE }}>
      <h3 className="mb-3 font-serif text-lg">{item ? t.editItem : t.newItem}</h3>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.nameEn}><Inp value={f.name_en} onChange={(v) => set("name_en", v)} /></Field>
        <Field label={t.nameAr}><Inp value={f.name_ar} onChange={(v) => set("name_ar", v)} dir="rtl" /></Field>
        <Field label={t.unitLabelEn} hint={t.unitHint}><Inp value={f.unit_label_en} onChange={(v) => set("unit_label_en", v)} /></Field>
        <Field label={t.unitLabelAr}><Inp value={f.unit_label_ar} onChange={(v) => set("unit_label_ar", v)} dir="rtl" /></Field>
        <Field label={t.servingsPerUnit} hint={t.servingsHint}>
          <Inp type="number" value={String(f.servings_per_unit)} onChange={(v) => set("servings_per_unit", Number(v))} />
        </Field>
        <Field label={t.lowThreshold}>
          <Inp type="number" value={String(f.low_stock_servings)} onChange={(v) => set("low_stock_servings", Number(v))} />
        </Field>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Toggle on={f.is_active} onClick={() => set("is_active", !f.is_active)} label={t.tracked} />
          <span className="text-sm" style={{ color: INKSOFT }}>{t.tracked}</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold" style={{ color: INKSOFT, background: "#faf3e4" }}>
            {t.cancel}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={pending || !valid}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-cream disabled:opacity-50"
            style={{ background: EMBER }}
          >
            {t.save}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ Recipes tab ------------------------------ */

function RecipesTab({
  inventory,
  items,
  categories,
  links,
  lang,
  dict,
}: {
  inventory: InventoryItem[];
  items: MenuItem[];
  categories: Category[];
  links: MenuItemIngredient[];
  lang: Locale;
  dict: Dictionary;
}) {
  const t = dict.inventory;
  const linksByItem = useMemo(() => {
    const m = new Map<number, MenuItemIngredient[]>();
    for (const l of links) {
      const arr = m.get(l.menu_item_id) ?? [];
      arr.push(l);
      m.set(l.menu_item_id, arr);
    }
    return m;
  }, [links]);

  if (inventory.length === 0) {
    return (
      <p className="py-12 text-center text-sm" style={{ color: FAINT }}>
        {t.emptyStock}
      </p>
    );
  }
  if (items.length === 0) {
    return (
      <p className="py-12 text-center text-sm" style={{ color: FAINT }}>
        {t.emptyMenu}
      </p>
    );
  }

  return (
    <div className="space-y-[26px]">
      {categories.map((cat) => {
        const catItems = items.filter((i) => i.category_id === cat.id);
        if (catItems.length === 0) return null;
        return (
          <section key={cat.id}>
            <h2 className="mb-2.5 font-serif text-[21px]">{lang === "ar" ? cat.name_ar : cat.name_en}</h2>
            <div className="space-y-2.5">
              {catItems.map((item) => (
                <RecipeEditor
                  key={item.id}
                  item={item}
                  inventory={inventory}
                  links={linksByItem.get(item.id) ?? []}
                  lang={lang}
                  dict={dict}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function RecipeEditor({
  item,
  inventory,
  links,
  lang,
  dict,
}: {
  item: MenuItem;
  inventory: InventoryItem[];
  links: MenuItemIngredient[];
  lang: Locale;
  dict: Dictionary;
}) {
  const t = dict.inventory;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [addId, setAddId] = useState("");
  const [addQty, setAddQty] = useState("1");

  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const invById = new Map(inventory.map((i) => [i.id, i]));
  const usedIds = new Set(links.map((l) => l.inventory_item_id));
  const available = inventory.filter((i) => !usedIds.has(i.id));
  const name = lang === "ar" ? item.name_ar : item.name_en;

  const add = () => {
    const invId = parseInt(addId, 10);
    const qty = parseInt(addQty, 10);
    if (Number.isInteger(invId) && Number.isInteger(qty) && qty > 0) {
      run(() => setRecipeLinkAction(item.id, invId, qty, lang).then(() => { setAddId(""); setAddQty("1"); }));
    }
  };

  return (
    <div className="rounded-[16px] border px-5 py-4" style={{ background: PANEL, borderColor: LINE }}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[15px] font-semibold">{name}</span>
        {!item.is_available && (
          <span className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase" style={{ background: "#f6e2dc", color: "#9c3b22" }}>
            {dict.admin.soldOut}
          </span>
        )}
      </div>

      {links.length === 0 ? (
        <p className="text-[12.5px]" style={{ color: FAINT }}>{t.noIngredients}</p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((l) => {
            const inv = invById.get(l.inventory_item_id);
            const invName = inv ? (lang === "ar" ? inv.name_ar : inv.name_en) : `#${l.inventory_item_id}`;
            return (
              <li key={l.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1" style={{ color: "#2e2218" }}>{invName}</span>
                <PerItemInput
                  link={l}
                  disabled={pending}
                  onSave={(spi) => run(() => setRecipeLinkAction(item.id, l.inventory_item_id, spi, lang))}
                  label={t.perItem}
                />
                <button
                  type="button"
                  onClick={() => run(() => removeRecipeLinkAction(item.id, l.inventory_item_id, lang))}
                  disabled={pending}
                  className="text-xs font-semibold disabled:opacity-50"
                  style={{ color: "#9c3b22" }}
                >
                  {t.remove}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {available.length > 0 && (
        <div className="mt-3 flex items-center gap-2 border-t pt-3" style={{ borderColor: "#f1e8d6" }}>
          <select
            value={addId}
            onChange={(e) => setAddId(e.target.value)}
            className="rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: "#e0d4bd" }}
            aria-label={t.selectItem}
          >
            <option value="">{t.selectItem}</option>
            {available.map((i) => (
              <option key={i.id} value={i.id}>{lang === "ar" ? i.name_ar : i.name_en}</option>
            ))}
          </select>
          <input
            value={addQty}
            onChange={(e) => setAddQty(e.target.value)}
            type="number"
            min="1"
            step="1"
            className="w-16 rounded-lg border bg-transparent px-2 py-1.5 text-sm"
            style={{ borderColor: "#e0d4bd" }}
            aria-label={t.perItem}
          />
          <span className="text-xs" style={{ color: FAINT }}>{t.perItem}</span>
          <button
            type="button"
            onClick={add}
            disabled={pending || !addId}
            className="rounded-lg px-3 py-1.5 text-sm font-semibold text-cream disabled:opacity-50"
            style={{ background: EMBER }}
          >
            {t.addIngredient}
          </button>
        </div>
      )}
    </div>
  );
}

function PerItemInput({
  link,
  disabled,
  onSave,
  label,
}: {
  link: MenuItemIngredient;
  disabled: boolean;
  onSave: (spi: number) => void;
  label: string;
}) {
  const [v, setV] = useState(String(link.servings_per_item));
  const commit = () => {
    const n = parseInt(v, 10);
    if (Number.isInteger(n) && n > 0 && n !== link.servings_per_item) onSave(n);
    else setV(String(link.servings_per_item));
  };
  return (
    <span className="flex items-center gap-1.5">
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
        type="number"
        min="1"
        step="1"
        disabled={disabled}
        className="w-14 rounded-lg border bg-transparent px-2 py-1 text-end text-sm tabular-nums"
        style={{ borderColor: "#e0d4bd" }}
      />
      <span className="text-xs" style={{ color: FAINT }}>{label}</span>
    </span>
  );
}

/* ------------------------------- small bits ------------------------------ */

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12.5px] font-semibold" style={{ color: INKSOFT }}>{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px]" style={{ color: FAINT }}>{hint}</span>}
    </label>
  );
}

function Inp({
  value,
  onChange,
  type = "text",
  dir,
}: {
  value: string;
  onChange: (v: string) => void;
  type?: string;
  dir?: "rtl" | "ltr";
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={type}
      dir={dir}
      min={type === "number" ? "0" : undefined}
      className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm"
      style={{ borderColor: "#e0d4bd" }}
    />
  );
}
