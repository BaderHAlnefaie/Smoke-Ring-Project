import Link from "next/link";
import { notFound } from "next/navigation";
import { getDictionary, isLocale } from "../dictionaries";
import { fetchDashboard } from "@/lib/db/admin-stats";
import { fetchTruckStatusAdmin } from "@/lib/db/admin-menu";
import { AdminTopbar } from "@/components/admin/AdminTopbar";
import { StatusBadge } from "@/components/order/StatusBadge";
import { UiIcon, type UiIconName } from "@/components/icons/UiIcon";
import { formatHalalas } from "@/lib/money";

export const dynamic = "force-dynamic";

const CARD = { background: "#fffefb", borderColor: "#ece1cc" } as const;

export default async function AdminDashboard({ params }: PageProps<"/[lang]/admin">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();

  const dict = await getDictionary(lang);
  const a = dict.admin;
  const [d, truck] = await Promise.all([fetchDashboard(lang), fetchTruckStatusAdmin()]);

  const kpis: { icon: UiIconName; chipBg: string; chipColor: string; value: string; label: string }[] = [
    { icon: "receipt", chipBg: "#fbe9cc", chipColor: "#c2622c", value: String(d.ordersToday), label: a.ordersToday },
    { icon: "coins", chipBg: "#eef2e6", chipColor: "#6e8b5b", value: formatHalalas(d.revenueTodayHalalas, lang), label: a.revenueToday },
    { icon: "clock", chipBg: "#e7eef4", chipColor: "#3f6fa0", value: d.avgPrepMins != null ? `${d.avgPrepMins} ${a.min}` : "—", label: a.avgPrep },
    { icon: "flame", chipBg: "#fbefd3", chipColor: "#c28a1f", value: String(d.activeNow), label: a.activeNow },
  ];
  const topMax = d.topSellers[0]?.count ?? 1;
  const today = new Date().toLocaleDateString(lang === "ar" ? "ar-SA" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <>
      <AdminTopbar
        title={dict.adminNav.dashboard}
        subtitle={a.subDashboard}
        action={
          <span className="rounded-xl border px-4 py-2.5 text-[13.5px] font-semibold" style={{ background: "#fffefb", borderColor: "#e2d6bf", color: "#6f6152" }}>
            {a.today} · {today}
          </span>
        }
      />
      <div className="px-9 pb-20 pt-7">
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((k, i) => (
            <div key={i} className="rounded-[18px] border p-[18px]" style={CARD}>
              <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl" style={{ background: k.chipBg, color: k.chipColor }}>
                <UiIcon name={k.icon} size={20} />
              </span>
              <div className="mt-3.5 font-serif text-3xl leading-none">{k.value}</div>
              <div className="mt-1.5 text-[13px]" style={{ color: "#8a7c6b" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-4" style={{ gridTemplateColumns: "1.7fr 1fr" }}>
          <div className="overflow-hidden rounded-[18px] border" style={CARD}>
            <div className="flex items-center justify-between px-5 pb-3 pt-[18px]">
              <h2 className="font-serif text-[19px]">{a.liveOrders}</h2>
              <Link href={`/${lang}/admin/orders`} className="text-[13px] font-semibold" style={{ color: "#c2622c" }}>
                {a.viewAll} →
              </Link>
            </div>
            {d.liveOrders.length === 0 ? (
              <p className="px-5 pb-5 text-sm" style={{ color: "#a99b86" }}>{dict.staff.empty}</p>
            ) : (
              d.liveOrders.map(({ order, items }) => {
                const summary = items
                  .map((it) => `${it.qty}× ${lang === "ar" ? it.name_ar : it.name_en}`)
                  .join("، ");
                const time = new Date(order.created_at).toLocaleTimeString(lang === "ar" ? "ar-SA" : "en-GB", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={order.id} className="flex items-center gap-3.5 px-5 py-3" style={{ borderTop: "1px solid #f1e8d6" }}>
                    <div style={{ minWidth: 74 }}>
                      <div className="text-sm font-bold tabular-nums">#{order.id}</div>
                      <div className="text-xs" style={{ color: "#a99b86" }}>{time}</div>
                    </div>
                    <div className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: "#6f6152" }}>{summary}</div>
                    <StatusBadge status={order.status} label={dict.order.states[order.status]} />
                  </div>
                );
              })
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-[18px] border p-[18px]" style={CARD}>
              <h2 className="mb-3.5 font-serif text-[19px]">{a.topSellers}</h2>
              {d.topSellers.length === 0 ? (
                <p className="text-sm" style={{ color: "#a99b86" }}>—</p>
              ) : (
                d.topSellers.map((s) => (
                  <div key={s.name} className="mb-3">
                    <div className="mb-1.5 flex justify-between gap-2.5 text-[13.5px]">
                      <span className="min-w-0 flex-1 truncate font-medium">{s.name}</span>
                      <span className="tabular-nums" style={{ color: "#a99b86" }}>{s.count}</span>
                    </div>
                    <div className="h-[7px] overflow-hidden rounded" style={{ background: "#f1e8d6" }}>
                      <div className="h-full rounded" style={{ width: `${Math.round((s.count / topMax) * 100)}%`, background: "#c2622c" }} />
                    </div>
                  </div>
                ))
              )}
            </div>

            <Link href={`/${lang}/admin/truck`} className="block rounded-[18px] p-[18px]" style={{ background: "#2a2017", color: "#e9dcc8" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12.5px] uppercase tracking-[.08em]" style={{ color: "#a08b6f" }}>{dict.adminNav.truck}</div>
                  <div className="mt-1 font-serif text-[21px]" style={{ color: "#fbf5e9" }}>
                    {truck?.is_open ? a.openTaking : a.closed}
                  </div>
                </div>
                <span className="h-3 w-3 rounded-full" style={{ background: truck?.is_open ? "#6e8b5b" : "#9c3b22" }} />
              </div>
              <div className="mt-3 text-[13px]" style={{ color: "#c3b49c" }}>
                {a.estWait} <strong style={{ color: "#f2d9b8" }}>{truck?.est_wait_minutes ?? 0} {a.min}</strong> · {truck?.accepting_scheduled ? a.scheduledOn : a.scheduledOff}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
