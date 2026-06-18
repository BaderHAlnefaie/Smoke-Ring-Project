"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/app/[lang]/dictionaries";

type Props = {
  current: Locale;
  other: Locale;
  label: string;
};

/**
 * Switches locale while staying on the same page — swaps the leading /[lang]
 * segment of the current path instead of always returning to the home page.
 */
export function LocaleSwitch({ current, other, label }: Props) {
  const pathname = usePathname() || `/${current}`;
  const rest = pathname.replace(new RegExp(`^/${current}(?=/|$)`), "") || "";
  const href = `/${other}${rest}`;

  return (
    <Link
      href={href}
      className="rounded-full border border-line bg-panel px-3.5 py-2 text-sm font-semibold text-ink hover:bg-cream-deep"
    >
      {label}
    </Link>
  );
}
