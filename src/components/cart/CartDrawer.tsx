"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { selectSubtotalHalalas, useCart } from "@/state/cart";
import { formatHalalas, totalHalalas, vatHalalas } from "@/lib/money";
import type { Dictionary } from "@/app/[lang]/dictionaries";
import type { Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
};

export function CartDrawer({ lang, dict }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const router = useRouter();
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  const clear = useCart((s) => s.clear);
  const subtotal = useCart(selectSubtotalHalalas);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!mounted) return null;

  async function handleCheckout() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          items: items.map((i) => ({ itemId: i.itemId, qty: i.qty })),
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
            type="button"
            onClick={close}
            aria-label="Close cart"
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
                    className="flex items-center gap-3 rounded-lg border border-black/[.06] dark:border-white/[.08] p-3"
                  >
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
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!isEmpty && (
          <footer className="border-t border-black/[.08] dark:border-white/[.08] px-4 py-4 space-y-2">
            <Row label={dict.cart.subtotal} value={formatHalalas(subtotal, lang)} />
            <Row label={dict.cart.vat} value={formatHalalas(vat, lang)} />
            <Row
              label={dict.cart.total}
              value={formatHalalas(total, lang)}
              bold
            />
            {error && (
              <p className="text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={handleCheckout}
              disabled={submitting}
              className="mt-2 w-full rounded-full bg-foreground px-5 py-3 text-base font-medium text-background disabled:opacity-60"
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
