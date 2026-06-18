"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/dal";
import {
  advanceOrderStatus,
  setItemPrepared,
  setOrderRush,
} from "@/lib/db/orders";
import { notifyOrderReady } from "@/lib/notify";
import { log } from "@/lib/log";

export type StaffActionState = { error?: string };

type NextStatus = "preparing" | "ready" | "picked_up" | "cancelled";

/**
 * Advance an order through its lifecycle. Authorization is enforced here
 * (requireStaff) AND transition legality is enforced in the DB RPC, so an
 * illegal jump is rejected even if the client is bypassed.
 */
export async function advanceOrder(
  orderId: number,
  next: NextStatus,
  lang: string,
): Promise<StaffActionState> {
  await requireStaff(`/${lang}/staff`);
  try {
    const updated = await advanceOrderStatus(orderId, next);
    if (next === "ready") await notifyOrderReady(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update_failed";
    log.warn("staff_advance_failed", { orderId, next, message });
    return { error: message };
  }
  revalidatePath(`/${lang}/staff`);
  return {};
}

/** Toggle a single item's prepared checkoff on the kitchen card. */
export async function toggleItemPrepared(
  orderItemId: number,
  prepared: boolean,
  lang: string,
): Promise<StaffActionState> {
  await requireStaff(`/${lang}/staff`);
  try {
    await setItemPrepared(orderItemId, prepared);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "update_failed" };
  }
  revalidatePath(`/${lang}/staff`);
  return {};
}

/** Flag/unflag an order as a rush. */
export async function toggleRush(
  orderId: number,
  isRush: boolean,
  lang: string,
): Promise<StaffActionState> {
  await requireStaff(`/${lang}/staff`);
  try {
    await setOrderRush(orderId, isRush);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "update_failed" };
  }
  revalidatePath(`/${lang}/staff`);
  return {};
}
