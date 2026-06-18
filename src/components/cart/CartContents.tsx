"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { selectSubtotalHalalas, useCart } from "@/state/cart";
import { formatHalalas, totalHalalas, vatHalalas } from "@/lib/money";
import { FoodIcon, iconForItem } from "@/components/icons/FoodIcon";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
  truckOpen: boolean;
  acceptingScheduled: boolean;
  estWaitMinutes: number;
  /** When provided, render a close button (drawer use). */
  onClose?: () => void;
  /** Fill the parent's height with a scrolling item list (drawer); else cap it. */
  fill?: boolean;
};

/** Smallest datetime-local value we accept: 15 minutes out, to the minute. */
function minScheduledLocal(): string {
  const d = new Date(Date.now() + 15 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The cart body — items, pickup, totals, checkout — shared by drawer + sidebar. */
export function CartContents({
  lang,
  dict,
  truckOpen,
  acceptingScheduled,
  estWaitMinutes,
  onClose,
  fill,
}: Props) {
  const router = useRouter();
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const setNotes = useCart((s) => s.setNotes);
  const clear = useCart((s) => s.clear);
  const pickupType = useCart((s) => s.pickupType);
  const scheduledFor = useCart((s) => s.scheduledFor);
  const setPickup = useCart((s) => s.setPickup);
  const subtotal = useCart(selectSubtotalHalalas);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const minLocal = minScheduledLocal();
  const asapBlocked = pickupType === "asap" && !truckOpen;
  const scheduledBlocked = pickupType === "scheduled" && !acceptingScheduled;
  const pickupBlocked = asapBlocked || scheduledBlocked;

  async function handleCheckout() {
    if (asapBlocked) return setError(dict.cart.truckClosed);
    if (scheduledBlocked) return setError(dict.cart.scheduledUnavailable);
    if (pickupType === "scheduled" && !scheduledFor) return setError(dict.cart.scheduleRequired);
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          items: items.map((i) => ({ itemId: i.itemId, qty: i.qty, notes: i.notes?.trim() || undefined })),
          pickupType,
          scheduledFor:
            pickupType === "scheduled" && scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
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
  const count = items.reduce((a, i) => a + i.qty, 0);

  return (
    <div className={fill ? "flex h-full flex-col" : "flex flex-col"}>
      <header className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 className="font-serif text-2xl">{dict.cart.title}</h2>
          {count > 0 && (
            <span className="rounded-full bg-ember-soft px-2.5 py-0.5 text-[13px] font-semibold text-ember">{count}</span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label={dict.cart.closeCart}
            className="rounded-full border border-line bg-panel p-1.5 text-ink-soft hover:bg-cream-deep"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </header>

      <div className={`overflow-y-auto px-5 pb-2 ${fill ? "flex-1" : "max-h-[42vh]"}`}>
        {isEmpty ? (
          <p className="py-16 text-center text-sm text-faint">{dict.cart.empty}</p>
        ) : (
          <ul className="space-y-2.5">
            {items.map((item) => {
              const name = lang === "ar" ? item.nameAr : item.nameEn;
              const lineTotal = item.unitHalalas * item.qty;
              return (
                <li key={item.itemId} className="rounded-2xl border border-line bg-panel p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-ember-soft text-ember">
                      <FoodIcon name={iconForItem(item.slug, item.nameEn)} size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{name}</div>
                      <div className="mt-1.5 flex w-fit items-center rounded-lg border border-line">
                        <button type="button" onClick={() => setQty(item.itemId, item.qty - 1)} aria-label={`${dict.cart.quantity} -`} className="h-7 w-7 text-base text-ember">−</button>
                        <span className="min-w-4 text-center text-[13px] font-semibold tabular-nums">{item.qty}</span>
                        <button type="button" onClick={() => setQty(item.itemId, item.qty + 1)} aria-label={`${dict.cart.quantity} +`} className="h-7 w-7 text-base text-ember">+</button>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatHalalas(lineTotal, lang)}</span>
                  </div>
                  <input
                    type="text"
                    value={item.notes ?? ""}
                    onChange={(e) => setNotes(item.itemId, e.target.value)}
                    maxLength={280}
                    placeholder={dict.cart.notesPlaceholder}
                    aria-label={`${name} — ${dict.cart.notesPlaceholder}`}
                    className="mt-2.5 w-full rounded-lg border border-line bg-cream px-2.5 py-1.5 text-sm"
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {!isEmpty && (
        <footer className="space-y-4 border-t border-line px-5 py-4">
          <fieldset className="space-y-2">
            <legend className="text-[11.5px] font-bold uppercase tracking-wider text-faint">{dict.cart.pickupTitle}</legend>
            <div className="flex gap-2.5">
              <PickupCard
                active={pickupType === "asap"}
                onClick={() => setPickup("asap")}
                title={dict.cart.pickupAsap}
                sub={estWaitMinutes > 0 ? `~${estWaitMinutes} ${dict.truck.minutes}` : dict.cart.estWait}
              />
              <PickupCard
                active={pickupType === "scheduled"}
                onClick={() => setPickup("scheduled", scheduledFor || minLocal)}
                title={dict.cart.pickupScheduled}
                sub={dict.cart.scheduleInstead}
              />
            </div>
            {pickupType === "scheduled" && (
              <input
                type="datetime-local"
                value={scheduledFor}
                min={minLocal}
                onChange={(e) => setPickup("scheduled", e.target.value)}
                aria-label={dict.cart.pickupScheduled}
                className="w-full rounded-lg border border-line bg-panel px-2.5 py-2 text-sm"
              />
            )}
            {asapBlocked ? (
              <p className="text-sm font-medium text-rust">
                {dict.cart.truckClosed}
                {acceptingScheduled ? ` ${dict.cart.scheduleInstead}` : ""}
              </p>
            ) : scheduledBlocked ? (
              <p className="text-sm font-medium text-rust">{dict.cart.scheduledUnavailable}</p>
            ) : null}
          </fieldset>

          <div className="space-y-1.5">
            <Row label={dict.cart.subtotal} value={formatHalalas(subtotal, lang)} />
            <Row label={dict.cart.vat} value={formatHalalas(vat, lang)} />
            <Row label={dict.cart.total} value={formatHalalas(total, lang)} bold />
          </div>
          {error && (
            <p className="text-sm text-rust" role="alert">{error}</p>
          )}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={submitting || pickupBlocked}
            className="w-full rounded-2xl bg-ember px-5 py-3.5 text-base font-bold text-cream shadow-lg shadow-ember/30 disabled:opacity-60"
          >
            {submitting ? dict.cart.checkoutPending : dict.cart.checkout}
          </button>
        </footer>
      )}
    </div>
  );
}

function PickupCard({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-2.5 text-start transition ${
        active ? "border-ember bg-ember-soft" : "border-line bg-panel"
      }`}
    >
      <div className={`text-[13.5px] font-semibold ${active ? "text-ink" : "text-ink-soft"}`}>{title}</div>
      <div className={`mt-0.5 text-[11.5px] ${active ? "text-clay" : "text-faint"}`}>{sub}</div>
    </button>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${bold ? "text-base font-bold text-ink" : "text-sm text-ink-soft"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
