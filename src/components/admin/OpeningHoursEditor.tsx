"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "./Toggle";
import { setOpeningHours } from "@/app/[lang]/admin/actions";
import type { OpeningHour } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

const DAYS = [
  { en: "Monday", ar: "الإثنين" },
  { en: "Tuesday", ar: "الثلاثاء" },
  { en: "Wednesday", ar: "الأربعاء" },
  { en: "Thursday", ar: "الخميس" },
  { en: "Friday", ar: "الجمعة" },
  { en: "Saturday", ar: "السبت" },
  { en: "Sunday", ar: "الأحد" },
];

function normalize(hours: OpeningHour[]): OpeningHour[] {
  const base: OpeningHour[] = Array.from({ length: 7 }, () => ({ open: "08:00", close: "15:00", closed: false }));
  if (Array.isArray(hours)) {
    hours.slice(0, 7).forEach((h, i) => {
      base[i] = { open: h.open || "08:00", close: h.close || "15:00", closed: !!h.closed };
    });
  }
  return base;
}

export function OpeningHoursEditor({
  hours,
  lang,
  dict,
}: {
  hours: OpeningHour[];
  lang: Locale;
  dict: Dictionary;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rows, setRows] = useState<OpeningHour[]>(() => normalize(hours));
  const [saved, setSaved] = useState(false);
  const a = dict.admin;

  const update = (i: number, patch: Partial<OpeningHour>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
    setSaved(false);
  };
  const save = () =>
    start(async () => {
      const res = await setOpeningHours(rows, lang);
      if (!res?.error) {
        setSaved(true);
        router.refresh();
      }
    });

  return (
    <div className="rounded-[18px] border p-[22px]" style={{ background: "#fffefb", borderColor: "#ece1cc" }}>
      <h2 className="font-serif text-xl">{a.openingHours}</h2>
      <p className="mb-2 mt-1 text-[13.5px]" style={{ color: "#8a7c6b" }}>{a.openingSub}</p>
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 py-2.5" style={{ borderTop: "1px solid #f1e8d6" }}>
          <span className="text-sm font-medium" style={{ minWidth: 96 }}>{lang === "ar" ? DAYS[i].ar : DAYS[i].en}</span>
          {r.closed ? (
            <span className="flex-1 text-[13.5px]" style={{ color: "#9c3b22" }}>{a.closedLabel}</span>
          ) : (
            <div className="flex flex-1 items-center gap-1.5">
              <input
                type="time"
                value={r.open}
                onChange={(e) => update(i, { open: e.target.value })}
                className="rounded-lg border px-2 py-1 text-sm tabular-nums"
                style={{ borderColor: "#e0d4bd" }}
              />
              <span style={{ color: "#a99b86" }}>—</span>
              <input
                type="time"
                value={r.close}
                onChange={(e) => update(i, { close: e.target.value })}
                className="rounded-lg border px-2 py-1 text-sm tabular-nums"
                style={{ borderColor: "#e0d4bd" }}
              />
            </div>
          )}
          <Toggle on={!r.closed} disabled={pending} onClick={() => update(i, { closed: !r.closed })} label={a.openForOrders} />
        </div>
      ))}
      <div className="mt-3.5 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-xl px-4 py-2.5 text-sm font-semibold text-cream disabled:opacity-60"
          style={{ background: "#c2622c" }}
        >
          {pending ? a.saving : a.save}
        </button>
        {saved && <span className="text-sm text-sage">{a.saved}</span>}
      </div>
    </div>
  );
}
