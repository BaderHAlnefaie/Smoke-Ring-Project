-- Smoke Ring — Phase 4
--   * create_order() now enforces truck availability server-side: ASAP orders are
--     rejected when the truck is closed, and scheduled orders when the truck isn't
--     accepting scheduled orders. This is the authoritative gate; the UI also
--     disables checkout, but the DB is the source of truth.
--   * notifications: a record of messages sent to customers (e.g. "order ready"),
--     readable by the owner and staff.

-- ---------- create_order with truck gating (replaces the 0004 definition) ----------

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
  v_line      jsonb;
  v_item_id   bigint;
  v_qty       integer;
  v_notes     text;
  v_item      public.menu_items%rowtype;
  v_truck     public.truck_status%rowtype;
  v_subtotal  integer := 0;
  v_vat       integer;
  v_total     integer;
  v_order     public.orders%rowtype;
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

  -- Truck availability is authoritative here.
  select * into v_truck from public.truck_status where id = 1;
  if p_pickup_type = 'asap' and not coalesce(v_truck.is_open, false) then
    raise exception 'The truck is closed right now' using errcode = 'P0001';
  end if;
  if p_pickup_type = 'scheduled' and not coalesce(v_truck.accepting_scheduled, false) then
    raise exception 'Scheduled orders are not being accepted right now' using errcode = 'P0001';
  end if;

  insert into public.orders (user_id, status, pickup_type, scheduled_for,
                             subtotal_halalas, vat_halalas, total_halalas)
  values (p_user_id, 'pending_payment', p_pickup_type,
          case when p_pickup_type = 'scheduled' then p_scheduled_for else null end,
          0, 0, 0)
  returning * into v_order;

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

    select * into v_item from public.menu_items where id = v_item_id for share;

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

revoke all on function public.create_order(uuid, jsonb, public.pickup_type, timestamptz) from public;
grant execute on function public.create_order(uuid, jsonb, public.pickup_type, timestamptz) to service_role;

-- ---------- Notifications ----------

create table public.notifications (
  id          bigint generated always as identity primary key,
  order_id    bigint not null references public.orders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  type        text not null,    -- e.g. 'order_ready'
  channel     text not null,    -- 'sms' | 'email' | 'log'
  status      text not null,    -- 'sent' | 'failed' | 'recorded'
  detail      text,
  created_at  timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;

-- Owners and staff can read; writes happen only via the service role.
create policy "Read own notifications"
  on public.notifications for select
  using (user_id = auth.uid() or public.is_staff());
