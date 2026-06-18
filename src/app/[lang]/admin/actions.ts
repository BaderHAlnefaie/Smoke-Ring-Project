"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import {
  createMenuItem,
  updateMenuItem,
  updateMenuItemFields,
  updateTruckStatus,
} from "@/lib/db/admin-menu";
import { log } from "@/lib/log";

export type AdminActionState = { ok?: boolean; error?: string };

async function gate(lang: string) {
  await requireAdmin(`/${lang}/admin`);
}
function fail(err: unknown): AdminActionState {
  log.warn("admin_action_failed", { message: err instanceof Error ? err.message : String(err) });
  return { error: "update_failed" };
}
function done(lang: string): AdminActionState {
  revalidatePath(`/${lang}/admin`, "layout");
  return { ok: true };
}

// ---- Truck ----
export async function setTruckOpen(open: boolean, lang: string): Promise<AdminActionState> {
  await gate(lang);
  try {
    await updateTruckStatus({ is_open: open });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function setTruckScheduled(scheduled: boolean, lang: string): Promise<AdminActionState> {
  await gate(lang);
  try {
    await updateTruckStatus({ accepting_scheduled: scheduled });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function setTruckWait(mins: number, lang: string): Promise<AdminActionState> {
  await gate(lang);
  const v = Math.max(0, Math.min(120, Math.round(mins)));
  try {
    await updateTruckStatus({ est_wait_minutes: v });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function setOpeningHours(
  hours: { open: string; close: string; closed: boolean }[],
  lang: string,
): Promise<AdminActionState> {
  await gate(lang);
  if (!Array.isArray(hours) || hours.length !== 7) return { error: "invalid_input" };
  const time = (s: unknown) => (/^\d{2}:\d{2}$/.test(String(s)) ? String(s) : "00:00");
  const clean = hours.map((h) => ({ open: time(h.open), close: time(h.close), closed: !!h.closed }));
  try {
    await updateTruckStatus({ opening_hours: clean });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

// ---- Menu ----
export async function setItemAvailable(id: number, available: boolean, lang: string): Promise<AdminActionState> {
  await gate(lang);
  try {
    await updateMenuItem(id, { is_available: available });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function setItemPrice(id: number, priceSar: number, lang: string): Promise<AdminActionState> {
  await gate(lang);
  const halalas = Math.round(priceSar * 100);
  if (!Number.isFinite(halalas) || halalas < 1 || halalas > 10_000_000) {
    return { error: "invalid_input" };
  }
  try {
    await updateMenuItem(id, { price_halalas: halalas });
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export type MenuDraft = {
  id?: number;
  name_en: string;
  name_ar: string;
  category_id: number;
  price_sar: number;
  ingredients_en: string;
  ingredients_ar: string;
  available: boolean;
};

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "item"
  );
}

/** Create a new menu item or update an existing one (full field set). */
export async function saveMenuItemDraft(draft: MenuDraft, lang: string): Promise<AdminActionState> {
  await gate(lang);

  const name_en = draft.name_en.trim();
  const name_ar = draft.name_ar.trim() || name_en;
  const category_id = Math.trunc(draft.category_id);
  const halalas = Math.round(draft.price_sar * 100);
  if (!name_en || !Number.isInteger(category_id) || category_id <= 0) return { error: "invalid_input" };
  if (!Number.isFinite(halalas) || halalas < 1 || halalas > 10_000_000) return { error: "invalid_input" };

  const fields = {
    category_id,
    name_en,
    name_ar,
    description_en: draft.ingredients_en.trim() || null,
    description_ar: draft.ingredients_ar.trim() || null,
    price_halalas: halalas,
    is_available: draft.available,
  };

  try {
    if (draft.id) {
      await updateMenuItemFields(draft.id, fields);
    } else {
      await createMenuItem({
        ...fields,
        slug: `${slugify(name_en)}-${Date.now().toString(36)}`,
        sort_order: 999,
      });
    }
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}
