import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem } from "./types";

export type AdminOrder = { order: Order; items: OrderItem[] };

const ACTIVE: Order["status"][] = ["paid", "preparing", "ready"];

function startOfTodayISO(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Count of in-flight orders — sidebar badge. */
export async function countActiveOrders(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .in("status", ACTIVE);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Recent orders across all customers, newest first, with their items. */
export async function fetchAdminOrders(limit = 80): Promise<AdminOrder[]> {
  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const list = (orders ?? []) as Order[];
  if (list.length === 0) return [];

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("*")
    .in("order_id", list.map((o) => o.id));
  if (itemsErr) throw new Error(itemsErr.message);

  const byOrder = new Map<number, OrderItem[]>();
  for (const it of (items ?? []) as OrderItem[]) {
    const arr = byOrder.get(it.order_id) ?? [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }
  return list.map((order) => ({ order, items: byOrder.get(order.id) ?? [] }));
}

export type Dashboard = {
  ordersToday: number;
  revenueTodayHalalas: number;
  avgPrepMins: number | null;
  activeNow: number;
  liveOrders: AdminOrder[];
  topSellers: { name: string; count: number }[];
};

/** KPIs + live feed + top sellers for the admin dashboard. */
export async function fetchDashboard(lang: "en" | "ar"): Promise<Dashboard> {
  const admin = createAdminClient();
  const todayISO = startOfTodayISO();

  // KPIs and top sellers are aggregated in SQL over the *full* day — no row cap,
  // no client-side reduce. (The old path capped at 2000 orders and derived top
  // sellers from only the last 40 orders, both wrong past those thresholds.)
  const [statsRes, sellersRes] = await Promise.all([
    admin.rpc("admin_dashboard_stats", { p_since: todayISO }),
    admin.rpc("admin_top_sellers", { p_since: todayISO, p_limit: 5 }),
  ]);
  if (statsRes.error) throw new Error(statsRes.error.message);
  if (sellersRes.error) throw new Error(sellersRes.error.message);

  const stats = statsRes.data?.[0];
  const ordersToday = Number(stats?.orders_today ?? 0);
  const revenueTodayHalalas = Number(stats?.revenue_today_halalas ?? 0);
  const avgPrepMins = stats?.avg_prep_mins == null ? null : Number(stats.avg_prep_mins);
  const activeNow = Number(stats?.active_now ?? 0);

  const topSellers = (sellersRes.data ?? []).map((r) => ({
    name: lang === "ar" ? r.name_ar : r.name_en,
    count: Number(r.qty),
  }));

  // Live feed: the newest few in-flight orders with their items, queried directly
  // (not derived from a capped recent-orders list).
  const { data: activeRows, error: activeErr } = await admin
    .from("orders")
    .select("*")
    .in("status", ACTIVE)
    .order("created_at", { ascending: false })
    .limit(5);
  if (activeErr) throw new Error(activeErr.message);
  const activeList = (activeRows ?? []) as Order[];

  let liveOrders: AdminOrder[] = [];
  if (activeList.length > 0) {
    const { data: items, error: itemsErr } = await admin
      .from("order_items")
      .select("*")
      .in("order_id", activeList.map((o) => o.id));
    if (itemsErr) throw new Error(itemsErr.message);
    const byOrder = new Map<number, OrderItem[]>();
    for (const it of (items ?? []) as OrderItem[]) {
      const arr = byOrder.get(it.order_id) ?? [];
      arr.push(it);
      byOrder.set(it.order_id, arr);
    }
    liveOrders = activeList.map((order) => ({ order, items: byOrder.get(order.id) ?? [] }));
  }

  return { ordersToday, revenueTodayHalalas, avgPrepMins, activeNow, liveOrders, topSellers };
}
