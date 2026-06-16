"use client";

import { useActionState } from "react";
import {
  saveTruckStatus,
  saveMenuItem,
  type AdminActionState,
} from "@/app/[lang]/admin/actions";
import type { MenuItem, TruckStatus } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  truck: TruckStatus | null;
  items: MenuItem[];
  lang: Locale;
  dict: Dictionary;
};

export function AdminPanel({ truck, items, lang, dict }: Props) {
  return (
    <div className="space-y-10">
      <TruckForm truck={truck} lang={lang} dict={dict} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{dict.admin.menuSection}</h2>
        <ul className="divide-y divide-black/[.06] dark:divide-white/[.08] rounded-lg border border-black/[.06] dark:border-white/[.08] bg-white dark:bg-zinc-950">
          {items.map((item) => (
            <MenuItemForm key={item.id} item={item} lang={lang} dict={dict} />
          ))}
        </ul>
      </section>
    </div>
  );
}

function StatusNote({ state, dict }: { state: AdminActionState | undefined; dict: Dictionary }) {
  if (state?.error) return <span className="text-sm text-red-600">{dict.admin.error}</span>;
  if (state?.ok) return <span className="text-sm text-emerald-600">{dict.admin.saved}</span>;
  return null;
}

function TruckForm({ truck, lang, dict }: { truck: TruckStatus | null } & Pick<Props, "lang" | "dict">) {
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    saveTruckStatus,
    undefined,
  );

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">{dict.admin.truckSection}</h2>
      <form
        action={action}
        className="space-y-3 rounded-lg border border-black/[.06] dark:border-white/[.08] bg-white dark:bg-zinc-950 p-4"
      >
        <input type="hidden" name="lang" value={lang} />
        <label className="flex items-center gap-2">
          <input type="checkbox" name="is_open" defaultChecked={truck?.is_open ?? false} />
          <span className="text-sm font-medium">{dict.admin.open}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            name="accepting_scheduled"
            defaultChecked={truck?.accepting_scheduled ?? false}
          />
          <span className="text-sm font-medium">{dict.admin.acceptingScheduled}</span>
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">{dict.admin.estWaitLabel}</span>
          <input
            type="number"
            name="est_wait_minutes"
            min={0}
            max={600}
            defaultValue={truck?.est_wait_minutes ?? 0}
            className="w-32 rounded-md border border-black/[.12] dark:border-white/[.16] bg-transparent px-2.5 py-1.5 text-sm tabular-nums"
          />
        </label>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-foreground px-4 py-1.5 text-sm font-medium text-background disabled:opacity-60"
          >
            {pending ? dict.admin.saving : dict.admin.save}
          </button>
          <StatusNote state={state} dict={dict} />
        </div>
      </form>
    </section>
  );
}

function MenuItemForm({ item, lang, dict }: { item: MenuItem } & Pick<Props, "lang" | "dict">) {
  const [state, action, pending] = useActionState<AdminActionState | undefined, FormData>(
    saveMenuItem,
    undefined,
  );
  const name = lang === "ar" ? item.name_ar : item.name_en;

  return (
    <li className="px-4 py-3">
      <form action={action} className="flex flex-wrap items-center gap-3">
        <input type="hidden" name="lang" value={lang} />
        <input type="hidden" name="id" value={item.id} />
        <span className="min-w-40 flex-1 font-medium">{name}</span>
        <label className="flex items-center gap-1.5 text-sm">
          <span className="text-zinc-500">{dict.admin.priceLabel}</span>
          <input
            type="number"
            name="price_sar"
            step="0.01"
            min="0.01"
            defaultValue={(item.price_halalas / 100).toFixed(2)}
            className="w-24 rounded-md border border-black/[.12] dark:border-white/[.16] bg-transparent px-2 py-1 text-sm tabular-nums"
          />
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="checkbox" name="is_available" defaultChecked={item.is_available} />
          <span>{dict.admin.available}</span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-black/[.15] dark:border-white/[.2] px-3 py-1 text-sm font-medium disabled:opacity-60"
        >
          {pending ? dict.admin.saving : dict.admin.save}
        </button>
        <StatusNote state={state} dict={dict} />
      </form>
    </li>
  );
}
