"use client";

import { useEffect } from "react";
import { useCart } from "@/state/cart";
import { useHydrated } from "@/lib/use-hydrated";
import { CartContents } from "./CartContents";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
  truckOpen: boolean;
  acceptingScheduled: boolean;
  estWaitMinutes: number;
};

/** Mobile/overlay cart — a slide-over wrapping the shared CartContents. */
export function CartDrawer({ lang, dict, truckOpen, acceptingScheduled, estWaitMinutes }: Props) {
  const mounted = useHydrated();
  const isOpen = useCart((s) => s.isOpen);
  const close = useCart((s) => s.close);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  if (!mounted) return null;

  return (
    <>
      <div
        aria-hidden={!isOpen}
        onClick={close}
        className={`fixed inset-0 z-40 bg-ink/40 backdrop-blur-[2px] transition-opacity ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={dict.cart.title}
        aria-hidden={!isOpen}
        className={`fixed inset-y-0 end-0 z-50 flex w-full max-w-md flex-col bg-cream shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : lang === "ar" ? "-translate-x-full" : "translate-x-full"
        }`}
      >
        <CartContents
          lang={lang}
          dict={dict}
          truckOpen={truckOpen}
          acceptingScheduled={acceptingScheduled}
          estWaitMinutes={estWaitMinutes}
          onClose={close}
          fill
        />
      </aside>
    </>
  );
}
