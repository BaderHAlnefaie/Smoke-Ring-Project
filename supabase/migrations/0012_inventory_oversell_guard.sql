-- 0012 — Prevent overselling inventory.
--
-- 0009 decremented stock with a bare `stock_servings = stock_servings - n` and
-- no floor, so concurrent paid orders that each passed the is_available check
-- could drive a shared ingredient's stock negative (auto-86 only reacts *after*
-- a depleting `ready` transition). Two layers of defense:
--   1. A CHECK constraint so stock can never be stored negative — data integrity
--      backstop that holds no matter who writes the row.
--   2. An explicit, catchable sufficiency check inside consume_order_inventory so
--      the failure is a clear "insufficient_stock" rather than an opaque
--      constraint violation.
--
-- Note: this stops *corruption* and surfaces the oversell at the preparing→ready
-- transition. Truly preventing the sale (blocking checkout when an ingredient
-- can't cover the order) belongs in create_order at order time and is tracked as
-- a follow-up — it needs a reserve-at-order / release-on-cancel model.

alter table public.inventory_items
  drop constraint if exists inventory_items_stock_nonneg;
alter table public.inventory_items
  add constraint inventory_items_stock_nonneg check (stock_servings >= 0);

create or replace function public.consume_order_inventory(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Idempotent: never consume the same order twice.
  if exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id and reason = 'order_prepared'
  ) then
    return;
  end if;

  for r in
    select mi.inventory_item_id as inv_id,
           sum(oi.qty * mi.servings_per_item)::integer as servings
    from public.order_items oi
    join public.menu_item_ingredients mi on mi.menu_item_id = oi.menu_item_id
    where oi.order_id = p_order_id
    group by mi.inventory_item_id
  loop
    -- Overselling guard: a tracked (active) ingredient must be able to cover
    -- what this order consumes. Lock the row first so concurrent consumes for
    -- the same hot ingredient serialize on the check instead of racing past it.
    perform 1
    from public.inventory_items
    where id = r.inv_id
    for update;

    if exists (
      select 1 from public.inventory_items
      where id = r.inv_id and is_active and stock_servings < r.servings
    ) then
      raise exception 'insufficient_stock for inventory_item % (needed %)', r.inv_id, r.servings
        using errcode = 'P0001';
    end if;

    update public.inventory_items
    set stock_servings = stock_servings - r.servings, updated_at = now()
    where id = r.inv_id;

    insert into public.inventory_movements (inventory_item_id, order_id, servings_delta, reason)
    values (r.inv_id, p_order_id, -r.servings, 'order_prepared');

    perform public.sync_menu_availability_for_inventory(r.inv_id);
  end loop;
end;
$$;

revoke all on function public.consume_order_inventory(bigint) from public, anon, authenticated;
