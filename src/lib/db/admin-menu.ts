import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MenuItem, TruckStatus } from "./types";

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

export async function updateMenuItem(
  id: number,
  patch: { price_halalas?: number; is_available?: boolean },
): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("menu_items").update(patch).eq("id", id);
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
}): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("truck_status")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw new Error(error.message);
}
