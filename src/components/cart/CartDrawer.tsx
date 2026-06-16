"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { selectSubtotalHalalas, useCart } from "@/state/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { formatHalalas, totalHalalas, vatHalalas } from "@/lib/money";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
  truckOpen: boolean;
  acceptingScheduled: boolean;
  estWaitMinutes: number;
};

/** Smallest datetime-local value we accept: 15 minutes out, to the minute. */
function minScheduledLocal(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CartDrawer({
  lang,
  dict,
  truckOpen,
  acceptingScheduled,
  estWaitMinutes,
}: Props) {
  const mounted = useHydrated();

  const router = useRouter();
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const setNotes = useCart((s) => s.setNotes);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const pickupType = useCart((s) => s.pickupType);
  const scheduledFor = useCart((s) => s.scheduledFor);
  const setPickup = useCart((s) => s.setPickup);
  const subtotal = useCart(selectSubtotalHalalas);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocused = useRef<HTMLElement | null>(null);

  // A11y: close on Escape, and move focus into the drawer when it opens /
  // restore it to the trigger when it closes.
  useEffect(() => {
    if (!isOpen) return;
    lastFocused.current = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      lastFocused.current?.focus?.();
    };
  }, [isOpen, close]);

  if (!mounted) return null;

  const minLocal = minScheduledLocal();

  const asapBlocked = pickupType === "asap" && !truckOpen;
  const scheduledBlocked = pickupType === "scheduled" && !acceptingScheduled;
  const pickupBlocked = asapBlocked || scheduledBlocked;

  async function handleCheckout() {
    if (asapBlocked) {
      setError(dict.cart.truckClosed);
      return;
    }
    if (scheduledBlocked) {
      setError(dict.cart.scheduledUnavailable);
      return;
    }
    if (pickupType === "scheduled" && !scheduledFor) {
      setError(dict.cart.scheduleRequired);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          items: items.map((i) => ({
            itemId: i.itemId,
            qty: i.qty,
            notes: i.notes?.trim() || undefined,
          })),
          pickupType,
          // datetime-local has no timezone; interpret in the browser's zone.
          scheduledFor:
            pickupType === "scheduled" && scheduledFor
              ? new Date(scheduledFor).toISOString()
              : undefined,
        }),
      });
      if (res.status === 401) {
        router.push(`/${lang}/sign-in?next=${encodeURIComponent(`/${lang}`)}`);
        return;
      }
      if (!res.ok) throw new Error("checkout_failed");
      const data = (await res.json()) as { paymentUrl?: string };
      if (!data.paymentUrl) throw new Error("no_payment_url");
      clear();
      window.location.href = data.paymentUrl;
    } catch {
      setError(dict.cart.checkoutError);
      setSubmitting(false);
    }
  }

  const vat = vatHalalas(subtotal);
  const total = totalHalalas(subtotal);
  const isEmpty = items.length === 0;

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={close}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dict.cart.title}
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-white dark:bg-zinc-950 shadow-xl transition-transform ${
          isOpen
            ? "translate-x-0"
            : lang === "ar"
              ? "-translate-x-full"
              : "translate-x-full"
        }`}
      >
        <header className="flex items-center justify-between border-b border-black/[.08] dark:border-white/[.08] px-4 py-3">
          <h2 className="text-lg font-semibold">{dict.cart.title}</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label={dict.cart.closeCart}
            className="rounded-full p-1 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isEmpty ? (
            <p className="py-12 text-center text-sm text-zinc-500">
              {dict.cart.empty}
            </p>
          ) : (
            <ul className="space-y-3">
              {items.map((item) => {
                const name = lang === "ar" ? item.nameAr : item.nameEn;
                const lineTotal = item.unitHalalas * item.qty;
                return (
                  <li
                    key={item.itemId}
                    className="space-y-2 rounded-lg border border-black/[.06] dark:border-white/[.08] p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="truncate font-medium">{name}</p>
                        <p className="text-sm text-zinc-500">
                          {formatHalalas(item.unitHalalas, lang)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setQty(item.itemId, item.qty - 1)}
                          aria-label={`${dict.cart.quantity} -`}
                          className="rounded-full p-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-6 text-center text-sm tabular-nums">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setQty(item.itemId, item.qty + 1)}
                          aria-label={`${dict.cart.quantity} +`}
                          className="rounded-full p-1.5 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="w-20 text-end text-sm tabular-nums">
                        {formatHalalas(lineTotal, lang)}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(item.itemId)}
                        aria-label={dict.cart.remove}
                        className="rounded-full p-1.5 text-zinc-500 hover:bg-black/[.04] dark:hover:bg-white/[.06]"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={item.notes ?? ""}
                      onChange={(e) => setNotes(item.itemId, e.target.value)}
                      maxLength={280}
                      placeholder={dict.cart.notesPlaceholder}
                      aria-label={`${name} — ${dict.cart.notesPlaceholder}`}
                      className="w-full rounded-md border border-black/[.08] dark:border-white/[.1] bg-transparent px-2.5 py-1.5 text-sm"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isEmpty && (
          <footer className="border-t border-black/[.08] dark:border-white/[.08] px-4 py-4 space-y-3">
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">{dict.cart.pickupTitle}</legend>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPickup("asap")}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    pickupType === "asap"
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/[.12] dark:border-white/[.16]"
                  }`}
                >
                  {dict.cart.pickupAsap}
                </button>
                <button
                  type="button"
                  onClick={() => setPickup("scheduled", scheduledFor || minLocal)}
                  className={`flex-1 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    pickupType === "scheduled"
                      ? "border-foreground bg-foreground text-background"
                      : "border-black/[.12] dark:border-white/[.16]"
                  }`}
                >
                  {dict.cart.pickupScheduled}
                </button>
              </div>
              {pickupType === "scheduled" && (
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  min={minLocal}
                  onChange={(e) => setPickup("scheduled", e.target.value)}
                  aria-label={dict.cart.pickupScheduled}
                  className="w-full rounded-md border border-black/[.12] dark:border-white/[.16] bg-transparent px-2.5 py-1.5 text-sm"
                />
              )}
              {asapBlocked ? (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {dict.cart.truckClosed}
                  {acceptingScheduled ? ` ${dict.cart.scheduleInstead}` : ""}
                </p>
              ) : scheduledBlocked ? (
                <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                  {dict.cart.scheduledUnavailable}
                </p>
              ) : pickupType === "asap" && estWaitMinutes > 0 ? (
                <p className="text-sm text-zinc-500">
                  ~{estWaitMinutes} {dict.truck.minutes} {dict.cart.estWait}
                </p>
              ) : null}
            </fieldset>

            <div className="space-y-2">
              <Row label={dict.cart.subtotal} value={formatHalalas(subtotal, lang)} />
              <Row label={dict.cart.vat} value={formatHalalas(vat, lang)} />
              <Row label={dict.cart.total} value={formatHalalas(total, lang)} bold />
            </div>
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting || pickupBlocked}
              className="mt-1 w-full rounded-full bg-foreground px-5 py-3 text-base font-medium text-background disabled:opacity-60"
            >
              {submitting ? dict.cart.checkoutPending : dict.cart.checkout}
            </button>
          </footer>
        )}
      </aside>
    </>
  );
}

function Row({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between text-sm ${
        bold ? "font-semibold text-base" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
