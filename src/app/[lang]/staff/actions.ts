"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/dal";
import { advanceOrderStatus } from "@/lib/db/orders";
import { notifyOrderReady } from "@/lib/notify";
import { log } from "@/lib/log";

const Schema = z.object({
  orderId: z.coerce.number().int().positive(),
  next: z.enum(["preparing", "ready", "picked_up", "cancelled"]),
  lang: z.string(),
});

export type StaffActionState = { error?: string };

/**
 * Advance an order's status from the staff board. Authorization is enforced here
 * (requireStaff) AND the transition legality is enforced in the DB RPC, so an
 * illegal jump (e.g. paid -> picked_up) is rejected even if the UI is bypassed.
 */
export async function setOrderStatus(
  _prev: StaffActionState | undefined,
  formData: FormData,
): Promise<StaffActionState> {
  const parsed = Schema.safeParse({
    orderId: formData.get("orderId"),
    next: formData.get("next"),
    lang: formData.get("lang"),
  });
  if (!parsed.success) return { error: "invalid_input" };

  const { orderId, next, lang } = parsed.data;

  // Throws/redirects if the caller isn't staff.
  await requireStaff(`/${lang}/staff`);

  let updated;
  try {
    updated = await advanceOrderStatus(orderId, next);
  } catch (err) {
    const message = err instanceof Error ? err.message : "update_failed";
    log.warn("staff_status_update_failed", { orderId, next, message });
    return { error: message };
  }

  // Tell the customer when their order is ready (fail-soft).
  if (next === "ready") {
    await notifyOrderReady(updated);
  }

  revalidatePath(`/${lang}/staff`);
  return {};
}
