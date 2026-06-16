"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus, type StaffActionState } from "@/app/[lang]/staff/actions";
import { formatHalalas } from "@/lib/money";
import type { Order, OrderItem, OrderStatus } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type OrderWithItems = { order: Order; items: OrderItem[] };

type Props = {
  orders: OrderWithItems[];
  lang: Locale;
  dict: Dictionary;
};

// Which actions are offered for each current status.
const ACTIONS: Record<string, { next: OrderStatus; key: keyof Dictionary["staff"]["actions"] }[]> = {
  paid: [{ next: "preparing", key: "startPreparing" }],
  preparing: [{ next: "ready", key: "markReady" }],
  ready: [{ next: "picked_up", key: "markPickedUp" }],
};

export function StaffBoard({ orders, lang, dict }: Props) {
  const router = useRouter();

  // Live board: pull fresh orders every 6s without a manual refresh.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(id);
  }, [router]);

  if (orders.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">{dict.staff.empty}</p>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {orders.map(({ order, items }) => (
        <OrderCard key={order.id} order={order} items={items} lang={lang} dict={dict} />
      ))}
    </ul>
  );
}

function OrderCard({ order, items, lang, dict }: { order: Order; items: OrderItem[] } & Pick<Props, "lang" | "dict">) {
  const [state, action, pending] = useActionState<StaffActionState | undefined, FormData>(
    setOrderStatus,
    undefined,
  );

  const dateLocale = lang === "ar" ? "ar-SA" : "en-SA";
  const placed = new Date(order.created_at).toLocaleTimeString(dateLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const scheduled =
    order.pickup_type === "scheduled" && order.scheduled_for
      ? new Date(order.scheduled_for).toLocaleString(dateLocale, {
          dateStyle: "short",
          timeStyle: "short",
        })
      : null;
  const actions = ACTIONS[order.status] ?? [];

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-black/[.08] dark:border-white/[.12] bg-white dark:bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold tabular-nums">#{order.id}</span>
        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {dict.order.states[order.status]}
        </span>
      </div>

      <p className="text-xs text-zinc-500">
        {placed}
        {scheduled ? ` · ${dict.order.scheduledFor} ${scheduled}` : ""}
      </p>

      <ul className="space-y-1 text-sm">
        {items.map((it) => {
          const name = lang === "ar" ? it.name_ar : it.name_en;
          return (
            <li key={it.id}>
              <div className="flex justify-between gap-2">
                <span className="min-w-0">
                  <span className="tabular-nums text-zinc-500">×{it.qty}</span> {name}
                </span>
                <span className="tabular-nums text-zinc-500">
                  {formatHalalas(it.unit_halalas * it.qty, lang)}
                </span>
              </div>
              {it.notes && <p className="text-xs text-amber-700 dark:text-amber-300">↳ {it.notes}</p>}
            </li>
          );
        })}
      </ul>

      <div className="flex items-center justify-between border-t border-black/[.06] dark:border-white/[.08] pt-2 text-sm font-medium">
        <span>{dict.cart.total}</span>
        <span className="tabular-nums">{formatHalalas(order.total_halalas, lang)}</span>
      </div>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      <div className="flex flex-wrap gap-2">
        {actions.map(({ next, key }) => (
          <form key={next} action={action}>
            <input type="hidden" name="orderId" value={order.id} />
            <input type="hidden" name="next" value={next} />
            <input type="hidden" name="lang" value={lang} />
            <button
              type="submit"
              disabled={pending}
              className="rounded-full bg-foreground px-3 py-1.5 text-sm font-medium text-background disabled:opacity-60"
            >
              {dict.staff.actions[key]}
            </button>
          </form>
        ))}
        <form action={action}>
          <input type="hidden" name="orderId" value={order.id} />
          <input type="hidden" name="next" value="cancelled" />
          <input type="hidden" name="lang" value={lang} />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
          >
            {dict.staff.actions.cancel}
          </button>
        </form>
      </div>
    </li>
  );
}
