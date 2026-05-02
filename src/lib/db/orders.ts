import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { vatHalalas, totalHalalas } from "@/lib/money";
import type { MenuItem, Order, OrderItem } from "./types";

export type CartLineInput = {
  itemId: number;
  qty: number;
};

export type CreatedOrder = {
  order: Order;
  items: OrderItem[];
};

export async function createPendingOrder(
  userId: string,
  lines: CartLineInput[],
): Promise<CreatedOrder> {
  if (lines.length === 0) throw new Error("Cart is empty");

  const admin = createAdminClient();

  const ids = Array.from(new Set(lines.map((l) => l.itemId)));
  const { data: items, error: menuErr } = await admin
    .from("menu_items")
    .select("id, name_en, name_ar, price_halalas, is_available")
    .in("id", ids);

  if (menuErr) throw new Error(`Menu lookup failed: ${menuErr.message}`);
  if (!items || items.length !== ids.length) {
    throw new Error("Some items in your cart are no longer available.");
  }
  for (const it of items as Pick<MenuItem, "id" | "is_available">[]) {
    if (!it.is_available) throw new Error("Some items in your cart are unavailable.");
  }

  const itemMap = new Map(
    (items as Array<Pick<MenuItem, "id" | "name_en" | "name_ar" | "price_halalas">>).map(
      (i) => [i.id, i],
    ),
  );

  let subtotal = 0;
  const itemsToInsert = lines.map((l) => {
    const item = itemMap.get(l.itemId);
    if (!item) throw new Error(`Unknown item ${l.itemId}`);
    if (l.qty <= 0 || !Number.isInteger(l.qty)) {
      throw new Error("Invalid item quantity.");
    }
    subtotal += item.price_halalas * l.qty;
    return {
      menu_item_id: item.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      qty: l.qty,
      unit_halalas: item.price_halalas,
    };
  });

  const vat = vatHalalas(subtotal);
  const total = totalHalalas(subtotal);

  const { data: orderRow, error: orderErr } = await admin
    .from("orders")
    .insert({
      user_id: userId,
      status: "pending_payment",
      pickup_type: "asap",
      subtotal_halalas: subtotal,
      vat_halalas: vat,
      total_halalas: total,
    })
    .select()
    .single();

  if (orderErr || !orderRow) {
    throw new Error(`Order create failed: ${orderErr?.message ?? "unknown"}`);
  }
  const order = orderRow as Order;

  const { data: insertedItems, error: itemsErr } = await admin
    .from("order_items")
    .insert(itemsToInsert.map((i) => ({ ...i, order_id: order.id })))
    .select();

  if (itemsErr || !insertedItems) {
    throw new Error(`Order items insert failed: ${itemsErr?.message ?? "unknown"}`);
  }

  return { order, items: insertedItems as OrderItem[] };
}

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
