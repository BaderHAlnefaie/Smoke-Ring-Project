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
      className="text-sm font-medium underline-offset-4 hover:underline px-2"
    >
      {label}
    </Link>
  );
}
