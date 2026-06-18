import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../../dictionaries";
import { fetchAdminOrders } from "@/lib/db/admin-stats";
import { formatHalalas } from "@/lib/money";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { OrdersTable, type OrderRow } from "@/components/admin/OrdersTable";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({ params }: PageProps<"/[lang]/admin/orders">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const a = dict.admin;
  const orders = await fetchAdminOrders(80);
  const timeLocale = lang === "ar" ? "ar-SA" : "en-GB";

  const rows: OrderRow[] = orders.map(({ order, items }) => ({
    id: order.id,
    time: new Date(order.created_at).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" }),
    summary: items.map((it) => `${it.qty}× ${lang === "ar" ? it.name_ar : it.name_en}`).join("، "),
    pickupLabel: order.pickup_type === "scheduled" ? a.scheduled : a.asap,
    pickupSub:
      order.pickup_type === "scheduled" && order.scheduled_for
        ? new Date(order.scheduled_for).toLocaleTimeString(timeLocale, { hour: "2-digit", minute: "2-digit" })
        : a.now,
    total: formatHalalas(order.total_halalas, lang),
    status: order.status,
    statusLabel: dict.order.states[order.status],
  }));

  return (
    <>
      <AdminTopbar title={dict.adminNav.orders} subtitle={a.subOrders} />
      <div className="px-9 pb-20 pt-7">
        <OrdersTable rows={rows} dict={dict} />
      </div>
    </>
  );
}
