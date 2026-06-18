-- Smoke Ring — Phase 3: server-side RPCs, order lifecycle, rate limiting
--
-- Why this migration exists:
--   * create_order(): the previous flow inserted the order then its items in two
--     separate round-trips from Node — a failure between them left orphan orders.
--     This makes order creation a single atomic transaction with prices computed
--     in SQL (one source of truth), including notes and scheduled pickup.
--   * advance_order_status(): the schema had preparing/ready/picked_up states but
--     nothing ever transitioned an order into them. This enforces a legal state
--     machine so staff actions can't put an order into an impossible state.
--   * rate_limit_hit(): fixed-window limiter so /api/orders and OTP requests can't
--     be hammered (Moyasar invoice spam, SMS cost, user enumeration).
--
-- All money is integer halalas. VAT is 15%, rounded half-away-from-zero to match
-- the TypeScript Math.round() in src/lib/money.ts.

-- ---------- Order item line shape ----------
-- p_lines is a jsonb array of objects: { "item_id": 1, "qty": 2, "notes": "no onions" }

create or replace function public.create_order(
  p_user_id      uuid,
  p_lines        jsonb,
  p_pickup_type  public.pickup_type default 'asap',
  p_scheduled_for timestamptz default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line         jsonb;
  v_item_id      bigint;
  v_qty          integer;
  v_notes        text;
  v_item         public.menu_items%rowtype;
  v_subtotal     integer := 0;
  v_vat          integer;
  v_total        integer;
  v_order        public.orders%rowtype;
begin
  if p_lines is null or jsonb_array_length(p_lines) = 0 then
    raise exception 'Cart is empty' using errcode = 'P0001';
  end if;
  if jsonb_array_length(p_lines) > 50 then
    raise exception 'Too many items' using errcode = 'P0001';
  end if;

  if p_pickup_type = 'scheduled' then
    if p_scheduled_for is null then
      raise exception 'A scheduled pickup needs a time' using errcode = 'P0001';
    end if;
    if p_scheduled_for <= now() then
      raise exception 'Scheduled time must be in the future' using errcode = 'P0001';
    end if;
    if p_scheduled_for > now() + interval '7 days' then
      raise exception 'Scheduled time is too far out' using errcode = 'P0001';
    end if;
  end if;

  -- Create the order shell first so we have an id for the items.
  insert into public.orders (user_id, status, pickup_type, scheduled_for,
                             subtotal_halalas, vat_halalas, total_halalas)
  values (p_user_id, 'pending_payment', p_pickup_type,
          case when p_pickup_type = 'scheduled' then p_scheduled_for else null end,
          0, 0, 0)
  returning * into v_order;

  -- Walk each cart line, locking the menu row and pricing it from the DB.
  for v_line in select * from jsonb_array_elements(p_lines)
  loop
    v_item_id := (v_line->>'item_id')::bigint;
    v_qty     := (v_line->>'qty')::integer;
    v_notes   := nullif(trim(coalesce(v_line->>'notes', '')), '');

    if v_qty is null or v_qty < 1 or v_qty > 99 then
      raise exception 'Invalid quantity for item %', v_item_id using errcode = 'P0001';
    end if;
    if v_notes is not null and length(v_notes) > 280 then
      raise exception 'Note is too long' using errcode = 'P0001';
    end if;

    select * into v_item
    from public.menu_items
    where id = v_item_id
    for share;

    if not found then
      raise exception 'Item % is no longer available', v_item_id using errcode = 'P0001';
    end if;
    if not v_item.is_available then
      raise exception 'Item "%" is unavailable', v_item.name_en using errcode = 'P0001';
    end if;

    v_subtotal := v_subtotal + (v_item.price_halalas * v_qty);

    insert into public.order_items
      (order_id, menu_item_id, name_en, name_ar, qty, unit_halalas, notes)
    values
      (v_order.id, v_item.id, v_item.name_en, v_item.name_ar, v_qty,
       v_item.price_halalas, v_notes);
  end loop;

  v_vat   := round(v_subtotal::numeric * 0.15)::integer;
  v_total := v_subtotal + v_vat;

  update public.orders
  set subtotal_halalas = v_subtotal,
      vat_halalas      = v_vat,
      total_halalas    = v_total,
      updated_at       = now()
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

-- ---------- Order lifecycle state machine ----------
-- Returns the updated order, or raises if the transition is illegal.
-- Called from the server with the service role after an is_staff() check.

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

  -- Legal transitions only.
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

  return v_order;
end;
$$;

-- ---------- Fixed-window rate limiter ----------

create table public.rate_limits (
  key           text not null,
  window_start  timestamptz not null,
  count         integer not null default 0,
  primary key (key, window_start)
);

-- Returns true if the call is allowed (under the limit), false if it should be
-- rejected. Buckets are aligned to p_window_seconds boundaries.
create or replace function public.rate_limit_hit(
  p_key            text,
  p_max            integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count        integer;
begin
  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_max;
end;
$$;

-- Opportunistic cleanup of old buckets (best-effort; safe to ignore failures).
create index rate_limits_window_idx on public.rate_limits (window_start);

-- ---------- Lock these down: server (service role) only ----------

revoke all on function public.create_order(uuid, jsonb, public.pickup_type, timestamptz) from public;
revoke all on function public.advance_order_status(bigint, public.order_status) from public;
revoke all on function public.rate_limit_hit(text, integer, integer) from public;

grant execute on function public.create_order(uuid, jsonb, public.pickup_type, timestamptz) to service_role;
grant execute on function public.advance_order_status(bigint, public.order_status) to service_role;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

-- rate_limits is written only via the security-definer function above.
alter table public.rate_limits enable row level security;
