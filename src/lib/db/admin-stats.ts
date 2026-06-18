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

  const { data: todays } = await admin
    .from("orders")
    .select("id,total_halalas,status,created_at,updated_at")
    .gte("created_at", todayISO)
    .limit(2000);
  const todayList = (todays ?? []) as Pick<
    Order,
    "id" | "total_halalas" | "status" | "created_at" | "updated_at"
  >[];
  const counted = todayList.filter(
    (o) => o.status !== "cancelled" && o.status !== "pending_payment",
  );
  const ordersToday = counted.length;
  const revenueTodayHalalas = counted.reduce((a, o) => a + o.total_halalas, 0);

  const prep = todayList
    .filter((o) => o.status === "picked_up" || o.status === "ready")
    .map((o) => (new Date(o.updated_at).getTime() - new Date(o.created_at).getTime()) / 60000)
    .filter((m) => m > 0 && m < 300);
  const avgPrepMins = prep.length
    ? Math.round(prep.reduce((a, b) => a + b, 0) / prep.length)
    : null;

  const recent = await fetchAdminOrders(40);
  const liveOrders = recent.filter((o) => ACTIVE.includes(o.order.status)).slice(0, 5);
  const activeNow = recent.filter((o) => ACTIVE.includes(o.order.status)).length;

  const tally = new Map<string, number>();
  for (const { order, items } of recent) {
    if (new Date(order.created_at).toISOString() < todayISO) continue;
    if (order.status === "cancelled" || order.status === "pending_payment") continue;
    for (const it of items) {
      const name = lang === "ar" ? it.name_ar : it.name_en;
      tally.set(name, (tally.get(name) ?? 0) + it.qty);
    }
  }
  const topSellers = [...tally.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { ordersToday, revenueTodayHalalas, avgPrepMins, activeNow, liveOrders, topSellers };
}
