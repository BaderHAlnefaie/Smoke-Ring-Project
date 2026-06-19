-- Smoke Ring — Phase 4: inventory / unit-piece (BOM) management
--
-- A dynamic bill-of-materials: each menu item consumes some number of "servings"
-- of one or more inventory items. Inventory is counted in *servings* internally
-- (the smallest divisible unit), never in fractional "units" — same discipline as
-- integer halalas for money, so there is no rounding drift. The admin enters a
-- yield ("a turkey bag makes 9 sandwiches" => servings_per_unit = 9) and the UI
-- derives whole units = stock_servings / servings_per_unit for display.
--
-- Stock is decremented when an order is marked READY (preparing -> ready) and is
-- restocked if a READY order is later cancelled. Both happen inside
-- advance_order_status() so they are atomic and cannot be bypassed by the client.
-- A ledger (inventory_movements) records every change and makes consume/restock
-- idempotent. When an ingredient can no longer cover a serving, dependent menu
-- items are auto-86'd (is_available = false, auto_86 = true) and re-enabled when
-- restocked — without ever overriding a manual disable.

-- ---------- Tables ----------

create table public.inventory_items (
  id                  bigint generated always as identity primary key,
  name_en             text not null,
  name_ar             text not null,
  unit_label_en       text not null default 'unit',   -- e.g. "bag"
  unit_label_ar       text not null default 'وحدة',   -- e.g. "كيس"
  servings_per_unit   integer not null check (servings_per_unit > 0),  -- bag => 9
  stock_servings      integer not null default 0,      -- on-hand, in servings
  low_stock_servings  integer not null default 0 check (low_stock_servings >= 0),
  is_active           boolean not null default true,   -- false => not tracked
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- The dynamic recipe/BOM: how many servings of an inventory item one unit of a
-- menu item consumes (turkey sandwich => 1, double => 2). Many rows per item.
create table public.menu_item_ingredients (
  id                bigint generated always as identity primary key,
  menu_item_id      bigint not null references public.menu_items(id) on delete cascade,
  inventory_item_id bigint not null references public.inventory_items(id) on delete cascade,
  servings_per_item integer not null default 1 check (servings_per_item > 0),
  unique (menu_item_id, inventory_item_id)
);
create index menu_item_ingredients_inv_idx on public.menu_item_ingredients (inventory_item_id);

-- Append-only ledger of every stock change.
create table public.inventory_movements (
  id                bigint generated always as identity primary key,
  inventory_item_id bigint not null references public.inventory_items(id) on delete cascade,
  order_id          bigint references public.orders(id) on delete set null,
  servings_delta    integer not null,                 -- negative = consumed
  reason            text not null check (reason in
                      ('order_prepared','order_cancelled_restock','stock_received','manual_adjustment')),
  created_by        uuid,
  created_at        timestamptz not null default now()
);
create index inventory_movements_item_idx on public.inventory_movements (inventory_item_id, created_at desc);

-- One consume and one restock per order, enforced at the DB level (idempotency).
create unique index inventory_movements_order_reason_idx
  on public.inventory_movements (order_id, reason)
  where order_id is not null and reason in ('order_prepared','order_cancelled_restock');

-- Distinguishes a stock-driven 86 from a manual one so restock only re-enables
-- what inventory turned off.
alter table public.menu_items
  add column if not exists auto_86 boolean not null default false;

-- ---------- Row-Level Security ----------
-- Inventory data is internal: no public policies => only the service role (which
-- bypasses RLS) can read/write it, same as orders. The storefront never reads
-- these tables; auto-86 flips menu_items.is_available, which is already
-- public-read.

alter table public.inventory_items       enable row level security;
alter table public.menu_item_ingredients enable row level security;
alter table public.inventory_movements   enable row level security;

-- ---------- Availability sync (auto-86) ----------

create or replace function public.sync_menu_availability_for_inventory(p_inventory_item_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 86 any currently-available item that can no longer cover one serving of this
  -- ingredient. (Note: menu_items has no updated_at column, so we don't set one.)
  update public.menu_items m
  set is_available = false, auto_86 = true
  from public.menu_item_ingredients mi
  join public.inventory_items inv on inv.id = mi.inventory_item_id
  where mi.menu_item_id = m.id
    and inv.id = p_inventory_item_id
    and inv.is_active
    and inv.stock_servings < mi.servings_per_item
    and m.is_available;

  -- Re-enable items that WE auto-86'd once every tracked ingredient can again
  -- cover a serving. Never touches a manually-disabled item (auto_86 = false).
  update public.menu_items m
  set is_available = true, auto_86 = false
  where m.auto_86
    and not exists (
      select 1
      from public.menu_item_ingredients mi
      join public.inventory_items inv on inv.id = mi.inventory_item_id
      where mi.menu_item_id = m.id
        and inv.is_active
        and inv.stock_servings < mi.servings_per_item
    );
end;
$$;

-- ---------- Consume stock for a prepared order ----------

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
    update public.inventory_items
    set stock_servings = stock_servings - r.servings, updated_at = now()
    where id = r.inv_id;

    insert into public.inventory_movements (inventory_item_id, order_id, servings_delta, reason)
    values (r.inv_id, p_order_id, -r.servings, 'order_prepared');

    perform public.sync_menu_availability_for_inventory(r.inv_id);
  end loop;
end;
$$;

-- ---------- Restock a cancelled (previously prepared) order ----------

create or replace function public.restock_order_inventory(p_order_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
begin
  -- Only if it was consumed and not already restocked.
  if not exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id and reason = 'order_prepared'
  ) then
    return;
  end if;
  if exists (
    select 1 from public.inventory_movements
    where order_id = p_order_id and reason = 'order_cancelled_restock'
  ) then
    return;
  end if;

  for r in
    select inventory_item_id as inv_id, -sum(servings_delta)::integer as servings
    from public.inventory_movements
    where order_id = p_order_id and reason = 'order_prepared'
    group by inventory_item_id
  loop
    update public.inventory_items
    set stock_servings = stock_servings + r.servings, updated_at = now()
    where id = r.inv_id;

    insert into public.inventory_movements (inventory_item_id, order_id, servings_delta, reason)
    values (r.inv_id, p_order_id, r.servings, 'order_cancelled_restock');

    perform public.sync_menu_availability_for_inventory(r.inv_id);
  end loop;
end;
$$;

-- ---------- Manual receive / adjust (admin) ----------

create or replace function public.adjust_inventory(
  p_inventory_item_id bigint,
  p_servings_delta    integer,
  p_reason            text,
  p_user              uuid default null
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item public.inventory_items%rowtype;
begin
  if p_reason not in ('stock_received', 'manual_adjustment') then
    raise exception 'Invalid adjustment reason %', p_reason using errcode = 'P0001';
  end if;

  update public.inventory_items
  set stock_servings = stock_servings + p_servings_delta, updated_at = now()
  where id = p_inventory_item_id
  returning * into v_item;

  if not found then
    raise exception 'Inventory item % not found', p_inventory_item_id using errcode = 'P0002';
  end if;

  insert into public.inventory_movements (inventory_item_id, servings_delta, reason, created_by)
  values (p_inventory_item_id, p_servings_delta, p_reason, p_user);

  perform public.sync_menu_availability_for_inventory(p_inventory_item_id);

  return v_item;
end;
$$;

-- ---------- Hook consume/restock into the lifecycle state machine ----------
-- Re-creates advance_order_status (from 0004) with two extra calls: consume on
-- the transition into 'ready', restock when a 'ready' order is cancelled.

create or replace function public.advance_order_status(
  p_order_id bigint,
  p_next     public.order_status
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current public.order_status;
  v_order   public.orders%rowtype;
  v_ok      boolean := false;
begin
  select status into v_current from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order % not found', p_order_id using errcode = 'P0002';
  end if;

  v_ok := (v_current = 'paid'      and p_next = 'preparing')
       or (v_current = 'preparing' and p_next = 'ready')
       or (v_current = 'ready'     and p_next = 'picked_up')
       or (v_current in ('paid', 'preparing', 'ready') and p_next = 'cancelled');

  if not v_ok then
    raise exception 'Illegal transition % -> %', v_current, p_next using errcode = 'P0001';
  end if;

  update public.orders
  set status = p_next, updated_at = now()
  where id = p_order_id
  returning * into v_order;

  -- Inventory side effects (no-ops when the order has no tracked ingredients).
  if p_next = 'ready' then
    perform public.consume_order_inventory(p_order_id);
  elsif p_next = 'cancelled' and v_current = 'ready' then
    perform public.restock_order_inventory(p_order_id);
  end if;

  return v_order;
end;
$$;

-- ---------- Lock down: service role only ----------

revoke all on function public.sync_menu_availability_for_inventory(bigint) from public;
revoke all on function public.consume_order_inventory(bigint) from public;
revoke all on function public.restock_order_inventory(bigint) from public;
revoke all on function public.adjust_inventory(bigint, integer, text, uuid) from public;

grant execute on function public.adjust_inventory(bigint, integer, text, uuid) to service_role;
-- advance_order_status keeps its existing service_role grant across CREATE OR
-- REPLACE; re-grant defensively in case it was dropped.
grant execute on function public.advance_order_status(bigint, public.order_status) to service_role;
