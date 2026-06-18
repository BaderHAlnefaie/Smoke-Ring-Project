"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  advanceOrder,
  toggleItemPrepared,
  toggleRush,
} from "@/app/[lang]/staff/actions";
import { FoodIcon, iconForItem } from "@/components/icons/FoodIcon";
import { UiIcon } from "@/components/icons/UiIcon";
import { Logo } from "@/components/brand/Logo";
import type { Order, OrderItem, OrderStatus } from "@/lib/db/types";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type OrderWithItems = { order: Order; items: OrderItem[]; customer?: string | null };

type Props = {
  orders: OrderWithItems[];
  completedToday: number;
  lang: Locale;
  dict: Dictionary;
};

function fmtElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** A short bell-like chime via the Web Audio API (no asset needed). */
function chime(ctx: AudioContext | null) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = 880;
  osc.connect(gain);
  gain.connect(ctx.destination);
  const t = ctx.currentTime;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  osc.start(t);
  osc.stop(t + 0.36);
}

const LANES: { status: OrderStatus; accent: string; titleKey: "new" | "preparing" | "ready" }[] = [
  { status: "paid", accent: "#5c8ac0", titleKey: "new" },
  { status: "preparing", accent: "#d2772f", titleKey: "preparing" },
  { status: "ready", accent: "#7fa268", titleKey: "ready" },
];

export function StaffBoard({ orders, completedToday, lang, dict }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [now, setNow] = useState(() => Date.now());
  const [railOpen, setRailOpen] = useState(true);
  const [sound, setSound] = useState(true);

  // Tick timers every 1s; pull fresh orders every 6s.
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const refresh = setInterval(() => router.refresh(), 6000);
    return () => {
      clearInterval(tick);
      clearInterval(refresh);
    };
  }, [router]);

  // Chime when a new (paid) order lands. AudioContext is created on the first
  // user gesture (browser autoplay policy); the sound toggle gates playback.
  const audioRef = useRef<AudioContext | null>(null);
  const seenPaid = useRef<Set<number>>(new Set());
  const primed = useRef(false);

  useEffect(() => {
    const prime = () => {
      if (!audioRef.current) {
        const Ctor =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctor) audioRef.current = new Ctor();
      }
      void audioRef.current?.resume?.();
    };
    window.addEventListener("pointerdown", prime);
    return () => window.removeEventListener("pointerdown", prime);
  }, []);

  useEffect(() => {
    const paidIds = orders.filter((o) => o.order.status === "paid").map((o) => o.order.id);
    const fresh = paidIds.filter((id) => !seenPaid.current.has(id));
    if (primed.current && sound && fresh.length > 0) chime(audioRef.current);
    paidIds.forEach((id) => seenPaid.current.add(id));
    primed.current = true;
  }, [orders, sound]);

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const sortLane = (a: OrderWithItems, b: OrderWithItems) =>
    Number(b.order.is_rush) - Number(a.order.is_rush) ||
    new Date(a.order.created_at).getTime() - new Date(b.order.created_at).getTime();

  // On-the-rail: undone items across New + Preparing.
  const tally = new Map<string, number>();
  for (const { order, items } of orders) {
    if (order.status !== "paid" && order.status !== "preparing") continue;
    for (const it of items) {
      if (it.prepared) continue;
      const name = lang === "ar" ? it.name_ar : it.name_en;
      tally.set(name, (tally.get(name) ?? 0) + it.qty);
    }
  }
  const railItems = [...tally.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty);

  const clock = new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  const dateLabel = new Date(now).toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-roast-deep" style={{ color: "#efe3d0" }}>
      {/* top bar */}
      <header
        className="flex items-center gap-5 px-6 py-3.5"
        style={{ background: "#2e2218", borderBottom: "1px solid rgba(255,255,255,.07)" }}
      >
        <div className="flex items-center gap-2.5">
          <Logo size={32} />
          <div>
            <div className="font-serif text-xl leading-none text-cream">{dict.header.appName}</div>
            <div className="mt-1 text-[11px] uppercase tracking-[.16em]" style={{ color: "#a08b6f" }}>
              {dict.staff.display}
            </div>
          </div>
        </div>

        <div
          className="ms-3.5 flex items-baseline gap-2.5 ps-[18px]"
          style={{ borderInlineStart: "1px solid rgba(255,255,255,.1)" }}
        >
          <span className="font-serif text-3xl tabular-nums text-cream">{clock}</span>
          <span className="text-[13px]" style={{ color: "#a08b6f" }}>{dateLabel}</span>
        </div>

        <div className="ms-auto flex items-center gap-2.5">
          <Stat label={dict.staff.active} value={orders.length} />
          <Stat label={dict.staff.doneToday} value={completedToday} valueColor="#9dbe86" />
          <button
            type="button"
            onClick={() => setRailOpen((v) => !v)}
            className="rounded-xl px-3.5 py-2 text-[13.5px] font-semibold"
            style={
              railOpen
                ? { background: "#c2622c", color: "#fbf5e9" }
                : { background: "#3a2c1f", color: "#c9a57b", border: "1px solid rgba(255,255,255,.12)" }
            }
          >
            {dict.staff.onTheRail}
          </button>
          <button
            type="button"
            onClick={() => {
              void audioRef.current?.resume?.();
              setSound((v) => !v);
            }}
            title="Sound"
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ background: "#3a2c1f", border: "1px solid rgba(255,255,255,.12)", color: sound ? "#9dbe86" : "#7c6a54" }}
          >
            <UiIcon name={sound ? "bell" : "bellOff"} size={19} />
          </button>
          <form action={`/${lang}/sign-out`} method="post">
            <button
              type="submit"
              className="rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold"
              style={{ background: "#3a2c1f", border: "1px solid rgba(255,255,255,.12)", color: "#c9a57b" }}
            >
              {dict.header.signOut}
            </button>
          </form>
        </div>
      </header>

      {/* on-the-rail strip */}
      {railOpen && (
        <div
          className="flex items-center gap-3.5 overflow-x-auto px-6 py-3"
          style={{ background: "#2a2017", borderBottom: "1px solid rgba(255,255,255,.06)" }}
        >
          <span className="flex-none text-[12px] font-bold uppercase tracking-[.1em]" style={{ color: "#a08b6f" }}>
            {dict.staff.onTheRail}
          </span>
          <div className="flex flex-wrap gap-2.5">
            {railItems.length === 0 ? (
              <span className="text-[13.5px]" style={{ color: "#7c6a54" }}>{dict.staff.railEmpty}</span>
            ) : (
              railItems.map((r) => (
                <span
                  key={r.name}
                  className="inline-flex items-center gap-2 rounded-[10px] px-3 py-1.5"
                  style={{ background: "#3a2c1f", border: "1px solid rgba(255,255,255,.08)" }}
                >
                  <span className="text-[15px] font-extrabold tabular-nums" style={{ color: "#f2b544" }}>
                    {r.qty}
                  </span>
                  <span style={{ color: "#c9a57b" }}>
                    <FoodIcon name={iconForItem("", r.name)} size={16} />
                  </span>
                  <span className="text-[13.5px] font-semibold" style={{ color: "#efe3d0" }}>{r.name}</span>
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {/* lanes */}
      <div className="grid min-h-0 flex-1 grid-cols-3 items-start gap-4 px-6 pb-6 pt-[18px]">
        {LANES.map((lane) => {
          const laneOrders = orders.filter((o) => o.order.status === lane.status).sort(sortLane);
          return (
            <section
              key={lane.status}
              className="flex min-h-0 flex-col rounded-[18px] p-3.5"
              style={{ background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.06)" }}
            >
              <div className="flex items-center gap-2.5 px-1.5 pb-3.5 pt-1">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: lane.accent }} />
                <h2 className="text-base font-extrabold uppercase tracking-wide text-cream">
                  {dict.staff.lanes[lane.titleKey]}
                </h2>
                <span
                  className="ms-auto flex h-6 min-w-6 items-center justify-center rounded-lg text-sm font-extrabold tabular-nums"
                  style={{ background: lane.accent, color: "#241a12" }}
                >
                  {laneOrders.length}
                </span>
              </div>

              <div
                className="flex flex-col gap-3 overflow-y-auto p-0.5"
                style={{ maxHeight: "calc(100vh - 230px)" }}
              >
                {laneOrders.length === 0 ? (
                  <div className="px-2.5 py-9 text-center text-sm" style={{ color: "#6e5c46" }}>
                    {dict.staff.laneEmpty}
                  </div>
                ) : (
                  laneOrders.map(({ order, items, customer }) => (
                    <Card
                      key={order.id}
                      order={order}
                      items={items}
                      customer={customer}
                      lang={lang}
                      dict={dict}
                      now={now}
                      pending={pending}
                      onAdvance={(next) => run(() => advanceOrder(order.id, next, lang))}
                      onCancel={() => run(() => advanceOrder(order.id, "cancelled", lang))}
                      onToggleItem={(itemId, prepared) => run(() => toggleItemPrepared(itemId, prepared, lang))}
                      onToggleRush={() => run(() => toggleRush(order.id, !order.is_rush, lang))}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value, valueColor }: { label: string; value: number; valueColor?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl px-3.5 py-2" style={{ background: "#3a2c1f" }}>
      <span className="text-[13px]" style={{ color: "#a08b6f" }}>{label}</span>
      <span className="text-lg font-extrabold tabular-nums" style={{ color: valueColor ?? "#fbf5e9" }}>
        {value}
      </span>
    </div>
  );
}

const ADV: Record<string, { next: "preparing" | "ready" | "picked_up"; key: "startPreparing" | "markReady" | "handOver"; bg: string }> = {
  paid: { next: "preparing", key: "startPreparing", bg: "#3f6fa0" },
  preparing: { next: "ready", key: "markReady", bg: "#c2622c" },
  ready: { next: "picked_up", key: "handOver", bg: "#5e7a4e" },
};

function Card({
  order,
  items,
  customer,
  lang,
  dict,
  now,
  pending,
  onAdvance,
  onCancel,
  onToggleItem,
  onToggleRush,
}: {
  order: Order;
  items: OrderItem[];
  customer?: string | null;
  lang: Locale;
  dict: Dictionary;
  now: number;
  pending: boolean;
  onAdvance: (next: "preparing" | "ready" | "picked_up") => void;
  onCancel: () => void;
  onToggleItem: (itemId: number, prepared: boolean) => void;
  onToggleRush: () => void;
}) {
  const elapsedMs = now - new Date(order.created_at).getTime();
  const mins = elapsedMs / 60000;
  const timer =
    mins >= 12
      ? { bg: "#f7ded7", color: "#b03a22" }
      : mins >= 6
        ? { bg: "#fbead0", color: "#9a6a12" }
        : { bg: "#e4efe0", color: "#3c6b43" };
  const border = order.is_rush ? "#c2412c" : mins >= 12 ? "#e7b9ac" : "transparent";

  const allDone = items.length > 0 && items.every((it) => it.prepared);
  const adv = ADV[order.status];

  const scheduledTime =
    order.pickup_type === "scheduled" && order.scheduled_for
      ? new Date(order.scheduled_for).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  return (
    <div
      className={order.is_rush ? "sr-pulse" : ""}
      style={{ background: "#fbf5e9", color: "#2e2218", borderRadius: 15, border: `2px solid ${border}`, overflow: "hidden" }}
    >
      <div className="flex items-start gap-2.5 px-4 pb-2 pt-3.5">
        <div className="min-w-0">
          <div className="text-[22px] font-extrabold leading-none tabular-nums">#{order.id}</div>
          <div className="mt-1 text-[13px]" style={{ color: "#8a7c6b" }}>
            {customer || dict.staff.walkIn}
          </div>
        </div>
        <div className="ms-auto text-end">
          <span
            className="inline-flex items-center gap-1.5 rounded-[9px] px-2.5 py-1 text-[15px] font-extrabold tabular-nums"
            style={{ background: timer.bg, color: timer.color }}
          >
            <UiIcon name="clock" size={14} />
            {fmtElapsed(elapsedMs)}
          </span>
          <div className="mt-1.5 flex justify-end gap-1.5">
            {order.is_rush && (
              <span
                className="rounded-[7px] px-2 py-0.5 text-[11px] font-extrabold tracking-wide"
                style={{ background: "#c2412c", color: "#fbf5e9" }}
              >
                {dict.staff.rush}
              </span>
            )}
            <span
              className="rounded-[7px] px-2 py-0.5 text-[11.5px] font-bold"
              style={
                scheduledTime
                  ? { background: "#e7eef4", color: "#33597d" }
                  : { background: "#e4efe0", color: "#3c6b43" }
              }
            >
              {scheduledTime ? `${dict.staff.pickup} ${scheduledTime}` : dict.staff.asap}
            </span>
          </div>
        </div>
      </div>

      <div className="px-2.5 pb-2 pt-0.5">
        {items.map((it) => {
          const name = lang === "ar" ? it.name_ar : it.name_en;
          return (
            <button
              key={it.id}
              type="button"
              disabled={pending}
              onClick={() => onToggleItem(it.id, !it.prepared)}
              className="flex w-full items-start gap-2.5 rounded-[10px] px-1.5 py-2 text-start"
            >
              {it.prepared ? (
                <span
                  className="mt-px flex h-6 w-6 flex-none items-center justify-center rounded-[7px] text-[15px] text-white"
                  style={{ background: "#6e8b5b" }}
                >
                  ✓
                </span>
              ) : (
                <span
                  className="mt-px h-6 w-6 flex-none rounded-[7px] bg-white"
                  style={{ border: "2px solid #d8c4a6" }}
                />
              )}
              <span
                className="flex-none text-[17px] font-extrabold tabular-nums"
                style={{ minWidth: 26, color: it.prepared ? "#c3b49c" : "#c2622c" }}
              >
                ×{it.qty}
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className="text-[15.5px] font-semibold"
                  style={{
                    color: it.prepared ? "#a99b86" : "#2e2218",
                    textDecoration: it.prepared ? "line-through" : "none",
                  }}
                >
                  {name}
                </span>
                {it.notes && (
                  <span
                    className="mt-1.5 inline-block rounded-[7px] px-2.5 py-1 text-[13px] font-semibold"
                    style={{ background: "#fbe4c8", color: "#a8501f" }}
                  >
                    ↳ {it.notes}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 px-3 pb-3 pt-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => onAdvance(adv.next)}
          className={`flex-1 rounded-xl py-3.5 text-[15px] font-bold disabled:opacity-60 ${
            order.status === "preparing" && allDone ? "sr-pulse" : ""
          }`}
          style={{ background: adv.bg, color: "#fbf5e9" }}
        >
          {dict.staff.actions[adv.key]}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onToggleRush}
          title={dict.staff.rush}
          className="flex w-12 items-center justify-center rounded-xl disabled:opacity-60"
          style={
            order.is_rush
              ? { background: "#c2412c", color: "#fbf5e9", border: "1px solid #c2412c" }
              : { background: "#fbf0ec", color: "#c2622c", border: "1px solid #f0d9c8" }
          }
        >
          <UiIcon name="flame" size={18} />
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onCancel}
          title={dict.staff.actions.cancel}
          className="w-12 rounded-xl text-xl disabled:opacity-60"
          style={{ background: "#fbf0ec", color: "#9c3b22", border: "1px solid #e4c9c0" }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
