import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Category, MenuItem, TruckStatus } from "./types";

export async function fetchMenu() {
  const supabase = await createClient();
  const [cats, items, truck] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order"),
    supabase.from("menu_items").select("*").order("sort_order"),
    supabase.from("truck_status").select("*").eq("id", 1).maybeSingle(),
  ]);
  return {
    categories: (cats.data ?? []) as Category[],
    items: (items.data ?? []) as MenuItem[],
    truck: (truck.data ?? null) as TruckStatus | null,
  };
}
