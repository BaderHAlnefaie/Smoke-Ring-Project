import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Category, MenuItem, TruckStatus } from "./types";

/** All menu items (including unavailable ones) for the admin console. */
export async function fetchAllMenuItems(): Promise<MenuItem[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("menu_items")
    .select("*")
    .order("category_id")
    .order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as MenuItem[];
}

/** All categories, ordered, for admin grouping/select. */
export async function fetchCategories(): Promise<Category[]> {
  const admin = createAdminClient();
  const { data, error } = await admin.from("categories").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as Category[];
}

export async function updateMenuItem(
  id: number,
  patch: { price_halalas?: number; is_available?: boolean },
): Promise<void> {
  const admin = createAdminClient();
  // A manual availability change takes control back from inventory auto-86, so
  // restocking won't silently flip the item the admin just set.
  const finalPatch = "is_available" in patch ? { ...patch, auto_86: false } : patch;
  const { error } = await admin.from("menu_items").update(finalPatch).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Full editable field set for an item (everything except slug/sort/image). */
export type MenuItemFields = {
  category_id: number;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  price_halalas: number;
  is_available: boolean;
};

export async function updateMenuItemFields(id: number, fields: MenuItemFields): Promise<void> {
  const admin = createAdminClient();
  // Saving an item sets is_available explicitly — clear inventory auto-86 too.
  const { error } = await admin
    .from("menu_items")
    .update({ ...fields, auto_86: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function createMenuItem(
  values: MenuItemFields & { slug: string; sort_order: number },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("menu_items").insert(values);
  if (error) throw new Error(error.message);
}

export async function fetchTruckStatusAdmin(): Promise<TruckStatus | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("truck_status")
    .select("*")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as TruckStatus | null;
}

export async function updateTruckStatus(patch: {
  is_open?: boolean;
  accepting_scheduled?: boolean;
  est_wait_minutes?: number;
  opening_hours?: { open: string; close: string; closed: boolean }[];
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("truck_status")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}
