import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "./dictionaries";
import { fetchMenu } from "@/lib/db/queries";
import { MenuList } from "@/components/menu/MenuList";

export default async function HomePage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const { categories, items, truck } = await fetchMenu();

  const isOpen = truck?.is_open ?? false;
  const wait = truck?.est_wait_minutes ?? 0;
  const statusLabel =
    isOpen && wait > 0
      ? `${dict.truck.open} · ~${wait} ${dict.truck.minutes}`
      : isOpen
        ? dict.truck.open
        : dict.truck.closed;
  const statusClass = isOpen
    ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
    : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{dict.menu.title}</h1>
        <span
          aria-live="polite"
          className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${statusClass}`}
        >
          {statusLabel}
        </span>
      </div>
      <MenuList categories={categories} items={items} lang={lang} dict={dict} />
    </main>
  );
}
