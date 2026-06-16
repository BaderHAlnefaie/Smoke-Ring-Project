import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderItem } from "./types";

export type CartLineInput = {
  itemId: number;
  qty: number;
  notes?: string | null;
};

export type PickupOptions = {
  pickupType?: "asap" | "scheduled";
  scheduledFor?: string | null;
};

export type CreatedOrder = {
  order: Order;
};

/**
 * Create a pending order atomically.
 *
 * Pricing, availability checks, VAT, and the order+items inserts all happen
 * inside the `create_order` Postgres function (single transaction), so a partial
 * failure can never leave an orphan order. Prices come from the DB, never the
 * client — the caller only supplies item ids, quantities, and optional notes.
 */
export async function createPendingOrder(
  userId: string,
  lines: CartLineInput[],
  options: PickupOptions = {},
): Promise<CreatedOrder> {
  if (lines.length === 0) throw new Error("Cart is empty");

  const admin = createAdminClient();

  const { data, error } = await admin.rpc("create_order", {
    p_user_id: userId,
    p_lines: lines.map((l) => ({
      item_id: l.itemId,
      qty: l.qty,
      notes: l.notes ?? null,
    })),
    p_pickup_type: options.pickupType ?? "asap",
    p_scheduled_for: options.scheduledFor ?? null,
  });

  if (error || !data) {
    // Postgres RAISE messages surface here; they're already user-readable.
    throw new Error(error?.message ?? "Order create failed");
  }

  return { order: data as Order };
}

export type OrderWithItems = { order: Order; items: OrderItem[] };

export async function fetchOrderForUser(orderId: number, userId: string) {
  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return null;

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);
  if (itemsErr) throw new Error(itemsErr.message);

  return { order: order as Order, items: (items ?? []) as OrderItem[] };
}

/** All orders for a user, newest first, for the order-history page. */
export async function fetchOrdersForUser(userId: string): Promise<Order[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []) as Order[];
}

/** Just the status of one of a user's orders — used for lightweight polling. */
export async function fetchOrderStatusForUser(
  orderId: number,
  userId: string,
): Promise<Order["status"] | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("orders")
    .select("status")
    .eq("id", orderId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? (data.status as Order["status"]) : null;
}

const ACTIVE_STATUSES: Order["status"][] = ["paid", "preparing", "ready"];

/** Active orders for the staff queue (paid → preparing → ready), with items. */
export async function fetchActiveOrdersForStaff(): Promise<OrderWithItems[]> {
  const admin = createAdminClient();
  const { data: orders, error } = await admin
    .from("orders")
    .select("*")
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) throw new Error(error.message);
  const list = (orders ?? []) as Order[];
  if (list.length === 0) return [];

  const { data: items, error: itemsErr } = await admin
    .from("order_items")
    .select("*")
    .in(
      "order_id",
      list.map((o) => o.id),
    );
  if (itemsErr) throw new Error(itemsErr.message);

  const byOrder = new Map<number, OrderItem[]>();
  for (const it of (items ?? []) as OrderItem[]) {
    const arr = byOrder.get(it.order_id) ?? [];
    arr.push(it);
    byOrder.set(it.order_id, arr);
  }
  return list.map((order) => ({ order, items: byOrder.get(order.id) ?? [] }));
}

/** Advance an order through its lifecycle via the validated RPC (staff only). */
export async function advanceOrderStatus(
  orderId: number,
  next: Order["status"],
): Promise<Order> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("advance_order_status", {
    p_order_id: orderId,
    p_next: next,
  });
  if (error || !data) throw new Error(error?.message ?? "Status update failed");
  return data as Order;
}
