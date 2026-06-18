"use client";

import { CartContents } from "./CartContents";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
  truckOpen: boolean;
  acceptingScheduled: boolean;
  estWaitMinutes: number;
};

/** Desktop (lg+) sticky cart sidebar — same CartContents as the mobile drawer. */
export function CartSidebar(props: Props) {
  return (
    <aside className="sticky top-[88px] hidden w-[362px] flex-none lg:block">
      <div className="overflow-hidden rounded-[22px] border border-line bg-cream shadow-[0_18px_40px_-24px_rgba(90,60,30,.4)]">
        <CartContents {...props} />
      </div>
    </aside>
  );
}
