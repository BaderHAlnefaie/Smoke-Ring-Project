import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { requireUser } from "@/lib/auth/dal";
import { fetchOrderForUser } from "@/lib/db/orders";
import { formatHalalas } from "@/lib/money";
import { OrderStatusLive } from "@/components/order/OrderStatusLive";

export const dynamic = "force-dynamic";

export default async function OrderPage({ params }: PageProps<"/[lang]/order/[id]">) {
  const { lang, id } = await params;
  if (!isLocale(lang)) notFound();

  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();

  const user = await requireUser(`/${lang}/order/${id}`);
  const dict = await getDictionary(lang);

  const result = await fetchOrderForUser(orderId, user.id);
  if (!result) notFound();

  const { order, items } = result;
  const placed = new Date(order.created_at);
  const dateLocale = lang === "ar" ? "ar-SA" : "en-SA";
  const placedFmt = placed.toLocaleString(dateLocale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const isPending = order.status === "pending_payment";

  const scheduledFmt =
    order.pickup_type === "scheduled" && order.scheduled_for
      ? new Date(order.scheduled_for).toLocaleString(dateLocale, {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          {dict.order.title} #{order.id}
        </h1>
        <p className="text-sm text-zinc-500">
          {dict.order.placedOn} {placedFmt}
        </p>
        {scheduledFmt && (
          <p className="text-sm text-zinc-500">
            {dict.order.scheduledFor} {scheduledFmt}
          </p>
        )}
      </div>

      <OrderStatusLive
        orderId={order.id}
        initialStatus={order.status}
        statusLabel={dict.order.status}
        states={dict.order.states}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{dict.order.items}</h2>
        <ul className="divide-y divide-black/[.06] dark:divide-white/[.08] rounded-lg border border-black/[.06] dark:border-white/[.08]">
          {items.map((it) => {
            const name = lang === "ar" ? it.name_ar : it.name_en;
            return (
              <li key={it.id} className="flex items-start gap-3 px-4 py-3">
                <span className="w-8 shrink-0 text-sm tabular-nums text-zinc-500">×{it.qty}</span>
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{name}</span>
                  {it.notes && (
                    <span className="block text-xs text-zinc-500 mt-0.5">{it.notes}</span>
                  )}
                </span>
                <span className="text-sm tabular-nums">
                  {formatHalalas(it.unit_halalas * it.qty, lang)}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-1 text-sm">
        <Row label={dict.cart.subtotal} value={formatHalalas(order.subtotal_halalas, lang)} />
        <Row label={dict.cart.vat} value={formatHalalas(order.vat_halalas, lang)} />
        <Row
          label={dict.cart.total}
          value={formatHalalas(order.total_halalas, lang)}
          bold
        />
      </section>

      {isPending && (
        <p className="text-sm text-zinc-500">
          {dict.order.states.pending_payment}…
        </p>
      )}

      <div className="flex items-center gap-4">
        <Link
          href={`/${lang}`}
          className="inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          {dict.order.back}
        </Link>
        <Link
          href={`/${lang}/orders`}
          className="inline-block text-sm font-medium underline-offset-4 hover:underline"
        >
          {dict.order.viewAll}
        </Link>
      </div>
    </main>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div
      className={`flex items-center justify-between ${
        bold ? "font-semibold text-base" : "text-zinc-600 dark:text-zinc-400"
      }`}
    >
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
