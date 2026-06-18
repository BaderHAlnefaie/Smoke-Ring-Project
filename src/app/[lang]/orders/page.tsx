import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { bounceOperator, requireUser } from "@/lib/auth/dal";
import { fetchOrdersForUser } from "@/lib/db/orders";
import { formatHalalas } from "@/lib/money";
import { StatusBadge } from "@/components/order/StatusBadge";

export const dynamic = "force-dynamic";

export default async function OrdersPage({ params }: PageProps<"/[lang]/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  await bounceOperator(lang);
  const user = await requireUser(`/${lang}/orders`);
  const dict = await getDictionary(lang);
  const orders = await fetchOrdersForUser(user.id);
  const dateLocale = lang === "ar" ? "ar-SA" : "en-SA";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-5 py-8 pb-24">
      <h1 className="mb-5 font-serif text-3xl">{dict.orders.title}</h1>

      {orders.length === 0 ? (
        <p className="py-16 text-center text-sm text-faint">{dict.orders.empty}</p>
      ) : (
        <ul className="overflow-hidden rounded-[18px] border border-line bg-panel">
          {orders.map((order) => {
            const placed = new Date(order.created_at).toLocaleString(dateLocale, {
              dateStyle: "medium",
              timeStyle: "short",
            });
            return (
              <li key={order.id} className="border-b border-line-soft last:border-b-0">
                <Link
                  href={`/${lang}/order/${order.id}`}
                  className="flex items-center gap-3 px-5 py-4 transition hover:bg-cream-deep/40"
                >
                  <span className="font-semibold tabular-nums">#{order.id}</span>
                  <span className="min-w-0 flex-1 text-sm text-faint">{placed}</span>
                  <StatusBadge status={order.status} label={dict.order.states[order.status]} />
                  <span className="w-24 shrink-0 text-end text-sm font-semibold tabular-nums">
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
        className="mt-5 inline-block text-sm font-semibold text-ember underline-offset-4 hover:underline"
      >
        {dict.order.back}
      </Link>
    </main>
  );
}
