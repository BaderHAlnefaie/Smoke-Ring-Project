import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InventoryItem, MenuItemIngredient } from "./types";

/** All inventory items for the admin console, alphabetical. */
export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("inventory_items").select("*").order("name_en");
  if (error) throw new Error(error.message);
  return (data ?? []) as InventoryItem[];
}

/** Every recipe link (menu item -> inventory item). Grouped by the caller. */
export async function fetchRecipeLinks(): Promise<MenuItemIngredient[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("menu_item_ingredients").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as MenuItemIngredient[];
}

export async function fetchInventoryItem(id: number): Promise<InventoryItem | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("inventory_items").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as InventoryItem | null;
}

export type InventoryItemInput = {
  name_en: string;
  name_ar: string;
  unit_label_en: string;
  unit_label_ar: string;
  servings_per_unit: number;
  low_stock_servings: number;
  is_active: boolean;
};

export async function createInventoryItem(values: InventoryItemInput): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("inventory_items").insert(values);
  if (error) throw new Error(error.message);
}

export async function updateInventoryItem(
  id: number,
  patch: Partial<InventoryItemInput>,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("inventory_items")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteInventoryItem(id: number): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("inventory_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

/**
 * Receive stock or correct a count through the ledgered `adjust_inventory` RPC,
 * so the movement is recorded and availability is re-synced in one transaction.
 * `servingsDelta` is positive to add, negative to remove.
 */
export async function adjustInventory(
  inventoryItemId: number,
  servingsDelta: number,
  reason: "stock_received" | "manual_adjustment",
  userId?: string | null,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("adjust_inventory", {
    p_inventory_item_id: inventoryItemId,
    p_servings_delta: servingsDelta,
    p_reason: reason,
    p_user: userId ?? null,
  });
  if (error) throw new Error(error.message);
}

/** Add or update how many servings of an inventory item a menu item consumes. */
export async function setRecipeLink(
  menuItemId: number,
  inventoryItemId: number,
  servingsPerItem: number,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("menu_item_ingredients").upsert(
    {
      menu_item_id: menuItemId,
      inventory_item_id: inventoryItemId,
      servings_per_item: servingsPerItem,
    },
    { onConflict: "menu_item_id,inventory_item_id" },
  );
  if (error) throw new Error(error.message);
}

export async function removeRecipeLink(
  menuItemId: number,
  inventoryItemId: number,
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("menu_item_ingredients")
    .delete()
    .eq("menu_item_id", menuItemId)
    .eq("inventory_item_id", inventoryItemId);
  if (error) throw new Error(error.message);
}
