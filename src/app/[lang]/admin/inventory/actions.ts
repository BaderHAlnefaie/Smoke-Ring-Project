"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import {
  adjustInventory,
  createInventoryItem,
  deleteInventoryItem,
  fetchInventoryItem,
  removeRecipeLink,
  setRecipeLink,
  updateInventoryItem,
  type InventoryItemInput,
} from "@/lib/db/inventory";
import { unitsToServings } from "@/lib/inventory";
import { log } from "@/lib/log";

export type InventoryActionState = { ok?: boolean; error?: string };

async function gate(lang: string) {
  return requireAdmin(`/${lang}/admin`);
}
function fail(err: unknown): InventoryActionState {
  log.warn("inventory_action_failed", { message: err instanceof Error ? err.message : String(err) });
  return { error: "update_failed" };
}
function done(lang: string): InventoryActionState {
  revalidatePath(`/${lang}/admin`, "layout");
  return { ok: true };
}

export type InventoryDraft = {
  name_en: string;
  name_ar: string;
  unit_label_en: string;
  unit_label_ar: string;
  servings_per_unit: number;
  low_stock_servings: number;
  is_active: boolean;
};

/** Coerce/validate a draft into a clean InventoryItemInput, or null if invalid. */
function clean(draft: InventoryDraft): InventoryItemInput | null {
  const name_en = (draft.name_en ?? "").trim();
  const name_ar = (draft.name_ar ?? "").trim() || name_en;
  const unit_label_en = (draft.unit_label_en ?? "").trim() || "unit";
  const unit_label_ar = (draft.unit_label_ar ?? "").trim() || unit_label_en;
  const servings_per_unit = Math.trunc(Number(draft.servings_per_unit));
  const low_stock_servings = Math.max(0, Math.trunc(Number(draft.low_stock_servings) || 0));
  if (!name_en) return null;
  if (!Number.isInteger(servings_per_unit) || servings_per_unit < 1 || servings_per_unit > 100000) return null;
  return {
    name_en,
    name_ar,
    unit_label_en,
    unit_label_ar,
    servings_per_unit,
    low_stock_servings,
    is_active: !!draft.is_active,
  };
}

export async function createInventoryItemAction(draft: InventoryDraft, lang: string): Promise<InventoryActionState> {
  await gate(lang);
  const values = clean(draft);
  if (!values) return { error: "invalid_input" };
  try {
    await createInventoryItem(values);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function updateInventoryItemAction(id: number, draft: InventoryDraft, lang: string): Promise<InventoryActionState> {
  await gate(lang);
  const values = clean(draft);
  if (!values) return { error: "invalid_input" };
  try {
    await updateInventoryItem(id, values);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function deleteInventoryItemAction(id: number, lang: string): Promise<InventoryActionState> {
  await gate(lang);
  try {
    await deleteInventoryItem(id);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

/** Receive N whole units of stock; converts to servings server-side from the item's yield. */
export async function receiveStockAction(id: number, units: number, lang: string): Promise<InventoryActionState> {
  const user = await gate(lang);
  const u = Math.trunc(Number(units));
  if (!Number.isInteger(u) || u < 1 || u > 100000) return { error: "invalid_input" };
  try {
    const item = await fetchInventoryItem(id);
    if (!item) return { error: "not_found" };
    const servings = unitsToServings(u, item.servings_per_unit);
    await adjustInventory(id, servings, "stock_received", user.id);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function setRecipeLinkAction(
  menuItemId: number,
  inventoryItemId: number,
  servingsPerItem: number,
  lang: string,
): Promise<InventoryActionState> {
  await gate(lang);
  const spi = Math.trunc(Number(servingsPerItem));
  if (!Number.isInteger(menuItemId) || !Number.isInteger(inventoryItemId)) return { error: "invalid_input" };
  if (!Number.isInteger(spi) || spi < 1 || spi > 100000) return { error: "invalid_input" };
  try {
    await setRecipeLink(menuItemId, inventoryItemId, spi);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}

export async function removeRecipeLinkAction(
  menuItemId: number,
  inventoryItemId: number,
  lang: string,
): Promise<InventoryActionState> {
  await gate(lang);
  try {
    await removeRecipeLink(menuItemId, inventoryItemId);
  } catch (e) {
    return fail(e);
  }
  return done(lang);
}
