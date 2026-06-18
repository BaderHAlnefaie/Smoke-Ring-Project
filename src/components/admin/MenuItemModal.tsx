"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { saveMenuItemDraft } from "@/app/[lang]/admin/actions";
import { Toggle } from "./Toggle";
import type { Category, MenuItem } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  item: MenuItem | null;
  categories: Category[];
  lang: Locale;
  dict: Dictionary;
  onClose: () => void;
};

const inputCls = "w-full rounded-xl border bg-[#fffefb] px-3.5 py-2.5 text-sm text-ink";
const inputStyle = { borderColor: "#e0d4bd" } as const;

export function MenuItemModal({ item, categories, lang, dict, onClose }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const a = dict.admin;

  const [nameEn, setNameEn] = useState(item?.name_en ?? "");
  const [nameAr, setNameAr] = useState(item?.name_ar ?? "");
  const [categoryId, setCategoryId] = useState(item?.category_id ?? categories[0]?.id ?? 0);
  const [price, setPrice] = useState(item ? (item.price_halalas / 100).toFixed(2) : "");
  const [ingEn, setIngEn] = useState(item?.description_en ?? "");
  const [ingAr, setIngAr] = useState(item?.description_ar ?? "");
  const [available, setAvailable] = useState(item?.is_available ?? true);
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    const priceNum = parseFloat(price);
    if (!nameEn.trim() || !(priceNum > 0)) {
      setError(a.error);
      return;
    }
    setError(null);
    start(async () => {
      const res = await saveMenuItemDraft(
        {
          id: item?.id,
          name_en: nameEn,
          name_ar: nameAr,
          category_id: categoryId,
          price_sar: priceNum,
          ingredients_en: ingEn,
          ingredients_ar: ingAr,
          available,
        },
        lang,
      );
      if (res?.error) {
        setError(a.error);
        return;
      }
      router.refresh();
      onClose();
    });
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(46,34,24,.5)", backdropFilter: "blur(3px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] overflow-hidden rounded-[22px]"
        style={{ background: "#fbf5e9", boxShadow: "0 30px 70px -20px rgba(40,25,10,.6)" }}
      >
        <div className="flex items-center justify-between px-6 pb-3.5 pt-5">
          <h2 className="font-serif text-[22px]">{item ? a.editItem : a.addItem}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-[34px] w-[34px] items-center justify-center rounded-full border text-base"
            style={{ borderColor: "#e0d4bd", background: "#fffefb", color: "#6f6152" }}
          >
            ✕
          </button>
        </div>
        <div className="px-6 pb-6">
          <Field label={a.itemNameEn}>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} style={inputStyle} placeholder="e.g. Smoke Ring Benedict" />
          </Field>
          <Field label={a.itemNameAr}>
            <input value={nameAr} onChange={(e) => setNameAr(e.target.value)} dir="rtl" className={inputCls} style={inputStyle} />
          </Field>
          <div className="mb-3.5 flex gap-3">
            <Field label={a.category} className="flex-1">
              <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className={inputCls} style={inputStyle}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {lang === "ar" ? c.name_ar : c.name_en}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={a.priceLabel} style={{ width: 140 }}>
              <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" step="0.01" min="0.01" className={inputCls} style={inputStyle} />
            </Field>
          </div>
          <Field label={a.ingredientsEn}>
            <input value={ingEn} onChange={(e) => setIngEn(e.target.value)} className={inputCls} style={inputStyle} placeholder="Turkey · Lettuce · Tomato" />
          </Field>
          <Field label={a.ingredientsAr}>
            <input value={ingAr} onChange={(e) => setIngAr(e.target.value)} dir="rtl" className={inputCls} style={inputStyle} />
          </Field>

          <div className="mb-5 mt-1 flex items-center justify-between rounded-xl border px-3.5 py-3" style={{ background: "#faf3e4", borderColor: "#ece1cc" }}>
            <span className="text-sm font-semibold">{a.availableNow}</span>
            <Toggle on={available} onClick={() => setAvailable((v) => !v)} disabled={pending} label={a.availableNow} />
          </div>

          {error && <p className="mb-3 text-sm text-rust">{error}</p>}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-[13px] border py-3 text-[15px] font-semibold"
              style={{ borderColor: "#e0d4bd", background: "#fffefb", color: "#3a2d22" }}
            >
              {a.cancel}
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending}
              className="rounded-[13px] py-3 text-[15px] font-bold text-cream disabled:opacity-60"
              style={{ flex: 2, background: "#c2622c" }}
            >
              {pending ? a.saving : item ? a.saveChanges : a.addItem}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
  style,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <label className={`mb-3.5 block ${className ?? ""}`} style={style}>
      <div className="mb-1.5 text-xs font-semibold" style={{ color: "#8a7c6b" }}>
        {label}
      </div>
      {children}
    </label>
  );
}
