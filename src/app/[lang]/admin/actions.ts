"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireStaff } from "@/lib/auth/dal";
import { updateMenuItem, updateTruckStatus } from "@/lib/db/admin-menu";
import { log } from "@/lib/log";

export type AdminActionState = { error?: string; ok?: boolean };

const TruckSchema = z.object({
  lang: z.string(),
  is_open: z.coerce.boolean(),
  accepting_scheduled: z.coerce.boolean(),
  est_wait_minutes: z.coerce.number().int().min(0).max(600),
});

export async function saveTruckStatus(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = TruckSchema.safeParse({
    lang: formData.get("lang"),
    // unchecked checkboxes are absent from FormData -> coerce missing to false
    is_open: formData.get("is_open") === "on",
    accepting_scheduled: formData.get("accepting_scheduled") === "on",
    est_wait_minutes: formData.get("est_wait_minutes"),
  });
  if (!parsed.success) return { error: "invalid_input" };

  const { lang, ...patch } = parsed.data;
  await requireStaff(`/${lang}/admin`);

  try {
    await updateTruckStatus(patch);
  } catch (err) {
    log.warn("admin_truck_update_failed", {
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: "update_failed" };
  }

  revalidatePath(`/${lang}/admin`);
  revalidatePath(`/${lang}`);
  return { ok: true };
}

const MenuItemSchema = z.object({
  lang: z.string(),
  id: z.coerce.number().int().positive(),
  // Price entered in SAR; stored as integer halalas.
  price_sar: z.coerce.number().min(0.01).max(100000),
  is_available: z.coerce.boolean(),
});

export async function saveMenuItem(
  _prev: AdminActionState | undefined,
  formData: FormData,
): Promise<AdminActionState> {
  const parsed = MenuItemSchema.safeParse({
    lang: formData.get("lang"),
    id: formData.get("id"),
    price_sar: formData.get("price_sar"),
    is_available: formData.get("is_available") === "on",
  });
  if (!parsed.success) return { error: "invalid_input" };

  const { lang, id, price_sar, is_available } = parsed.data;
  await requireStaff(`/${lang}/admin`);

  try {
    await updateMenuItem(id, {
      price_halalas: Math.round(price_sar * 100),
      is_available,
    });
  } catch (err) {
    log.warn("admin_menu_update_failed", {
      id,
      message: err instanceof Error ? err.message : String(err),
    });
    return { error: "update_failed" };
  }

  revalidatePath(`/${lang}/admin`);
  revalidatePath(`/${lang}`);
  return { ok: true };
}
