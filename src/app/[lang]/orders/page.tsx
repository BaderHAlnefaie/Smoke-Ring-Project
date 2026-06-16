import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { requireUser } from "@/lib/auth/dal";
import { fetchOrdersForUser } from "@/lib/db/orders";
import { formatHalalas } from "@/lib/money";

export const dynamic = "force-dynamic";

const ACTIVE = new Set(["paid", "preparing", "ready"]);

export default async function OrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const user = await requireUser(`/${lang}/orders`);
  const dict = await getDictionary(lang);
  const orders = await fetchOrdersForUser(user.id);
  const dateLocale = lang === "ar" ? "ar-SA" : "en-SA";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{dict.orders.title}</h1>

      {orders.length === 0 ? (
        <p className="py-12 text-center text-sm text-zinc-500">{dict.orders.empty}</p>
      ) : (
        <ul className="divide-y divide-black/[.06] dark:divide-white/[.08] rounded-lg border border-black/[.06] dark:border-white/[.08] bg-white dark:bg-zinc-950">
          {orders.map((order) => {
            const placed = new Date(order.created_at).toLocaleString(dateLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            });
            const badge = ACTIVE.has(order.status)
              ? "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : order.status === "cancelled"
                ? "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200"
                : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";
            return (
              <li key={order.id}>
                <Link
                  href={`/${lang}/order/${order.id}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-black/[.02] dark:hover:bg-white/[.04] transition"
                >
                  <span className="font-medium tabular-nums">#{order.id}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-zinc-500">{placed}</span>
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${badge}`}
                  >
                    {dict.order.states[order.status]}
                  </span>
                  <span className="w-20 shrink-0 text-end text-sm tabular-nums">
                    {formatHalalas(order.total_halalas, lang)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Link
        href={`/${lang}`}
        className="inline-block text-sm font-medium underline-offset-4 hover:underline"
      >
        {dict.order.back}
      </Link>
    </main>
  );
}
