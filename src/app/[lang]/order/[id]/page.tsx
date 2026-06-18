import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { bounceOperator, requireUser } from "@/lib/auth/dal";
import { fetchOrderForUser } from "@/lib/db/orders";
import { formatHalalas } from "@/lib/money";
import { OrderStatusLive } from "@/components/order/OrderStatusLive";
import { iconForItem } from "@/components/icons/FoodIcon";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/[lang]/order/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  await bounceOperator(lang);
  const user = await requireUser(`/${lang}/order/${id}`);
  const dict = await getDictionary(lang);

  const result = await fetchOrderForUser(orderId, user.id);
  if (!result) notFound();

  const { order, items } = result;
  const dateLocale = lang === "ar" ? "ar-SA" : "en-SA";
  const scheduledFmt =
    order.pickup_type === "scheduled" && order.scheduled_for
      ? new Date(order.scheduled_for).toLocaleString(dateLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  const heroIcon = iconForItem("", items[0]?.name_en ?? "");
  const count = items.reduce((a, it) => a + it.qty, 0);

  return (
    <main className="mx-auto w-full max-w-[600px] flex-1 px-5 py-8 pb-24">
      <Link
        href={`/${lang}`}
        className="inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink"
      >
        <span aria-hidden>{lang === "ar" ? "›" : "‹"}</span>
        {dict.order.back}
      </Link>

      <div className="mt-4 text-[13px] text-faint">
        {dict.order.title}{" "}
        <span className="font-semibold text-ink-soft tabular-nums">#{order.id}</span>
      </div>
      {scheduledFmt && (
        <div className="mt-1 text-[13px] text-faint">
          {dict.order.scheduledFor} {scheduledFmt}
        </div>
      )}

      <OrderStatusLive
        orderId={order.id}
        initialStatus={order.status}
        states={dict.order.states}
        iconName={heroIcon}
        nowLabel={dict.order.now}
      />

      <section className="mt-5 rounded-[22px] border border-line bg-panel px-5 py-4">
        <div className="mb-2 text-[11.5px] font-bold uppercase tracking-wider text-faint">
          {count} {dict.order.items}
        </div>
        {items.map((it) => {
          const name = lang === "ar" ? it.name_ar : it.name_en;
          return (
            <div key={it.id} className="py-1.5">
              <div className="flex items-center justify-between text-[14.5px]">
                <span>
                  <span className="tabular-nums text-ink-soft">{it.qty} × </span>
                  {name}
                </span>
                <span className="tabular-nums text-ink-soft">
                  {formatHalalas(it.unit_halalas * it.qty, lang)}
                </span>
              </div>
              {it.notes && <div className="mt-0.5 text-xs text-clay">↳ {it.notes}</div>}
            </div>
          );
        })}
        <div className="mt-1.5 flex items-center justify-between border-t border-line-soft pt-3 text-[15.5px] font-bold">
          <span>{dict.order.totalPaid}</span>
          <span className="tabular-nums">{formatHalalas(order.total_halalas, lang)}</span>
        </div>
      </section>

      <Link
        href={`/${lang}/orders`}
        className="mt-5 inline-block text-sm font-semibold text-ember underline-offset-4 hover:underline"
      >
        {dict.order.viewAll}
      </Link>
    </main>
  );
}
