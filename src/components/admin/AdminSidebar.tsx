"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UiIcon, type UiIconName } from "@/components/icons/UiIcon";
import { Logo } from "@/components/brand/Logo";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  lang: Locale;
  dict: Dictionary;
  activeOrders: number;
  userEmail: string;
};

export function AdminSidebar({ lang, dict, activeOrders, userEmail }: Props) {
  const pathname = usePathname() || "";
  const base = `/${lang}/admin`;

  const items: { href: string; icon: UiIconName; label: string; badge?: number }[] = [
    { href: base, icon: "grid", label: dict.adminNav.dashboard },
    { href: `${base}/orders`, icon: "receipt", label: dict.adminNav.orders, badge: activeOrders },
    { href: `${base}/menu`, icon: "bowl", label: dict.adminNav.menu },
    { href: `${base}/truck`, icon: "truck", label: dict.adminNav.truck },
    { href: `${base}/team`, icon: "users", label: dict.adminNav.team },
  ];
  const isActive = (href: string) =>
    href === base ? pathname === base || pathname === `${base}/` : pathname.startsWith(href);

  return (
    <aside
      className="flex h-full w-[248px] flex-none flex-col p-4"
      style={{ background: "#2a2017", color: "#e9dcc8" }}
    >
      <Link href={base} className="flex items-center gap-2.5 px-2 pb-5 pt-1.5">
        <Logo size={34} />
        <div>
          <div className="font-serif text-lg leading-none text-cream">{dict.header.appName}</div>
          <div className="mt-1 text-[11px] uppercase tracking-[.12em]" style={{ color: "#a08b6f" }}>
            {dict.adminNav.backOffice}
          </div>
        </div>
      </Link>

      <nav className="flex flex-col gap-1">
        {items.map((it) => {
          const active = isActive(it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold"
              style={active ? { background: "#c2622c", color: "#fbf5e9" } : { color: "#c3b49c" }}
            >
              <UiIcon name={it.icon} size={19} />
              {it.label}
              {it.badge ? (
                <span className="ms-auto text-xs" style={{ opacity: 0.85 }}>
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto">
        <div
          className="flex items-center gap-2.5 border-t pt-3"
          style={{ borderColor: "rgba(255,255,255,.08)" }}
        >
          <div
            className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold"
            style={{ background: "#4a3829", color: "#f2d9b8" }}
          >
            {userEmail.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold" style={{ color: "#f1e6d4" }}>
              {userEmail}
            </div>
            <div className="text-[11.5px]" style={{ color: "#9f8b6f" }}>
              {dict.team.roleAdmin}
            </div>
          </div>
        </div>
        <form action={`/${lang}/sign-out`} method="post" className="mt-1.5">
          <button
            type="submit"
            className="w-full rounded-xl px-3 py-2 text-start text-[13px] font-semibold"
            style={{ color: "#9f8b6f" }}
          >
            {dict.header.signOut}
          </button>
        </form>
      </div>
    </aside>
  );
}
