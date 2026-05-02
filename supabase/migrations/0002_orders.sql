-- Smoke Ring — Phase 2 schema
-- Adds: profiles, user_roles, orders, order_items, payments
-- All money in integer halalas. Status writes go through the service role.

-- ---------- Roles ----------

create type public.app_role as enum ('customer', 'staff', 'admin');

create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  phone         text,
  display_name  text,
  created_at    timestamptz not null default now()
);

create table public.user_roles (
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     public.app_role not null,
  primary key (user_id, role)
);

-- Helper: does the caller hold any of (staff, admin)?
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid()
      and role in ('staff', 'admin')
  );
$$;

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, phone)
  values (new.id, new.phone)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Orders ----------

create type public.order_status as enum (
  'pending_payment', 'paid', 'preparing', 'ready', 'picked_up', 'cancelled'
);

create type public.pickup_type as enum ('asap', 'scheduled');

create table public.orders (
  id                bigint generated always as identity primary key,
  user_id           uuid not null references auth.users(id) on delete restrict,
  status            public.order_status not null default 'pending_payment',
  pickup_type       public.pickup_type not null default 'asap',
  scheduled_for     timestamptz,
  subtotal_halalas  integer not null check (subtotal_halalas >= 0),
  vat_halalas       integer not null check (vat_halalas >= 0),
  total_halalas     integer not null check (total_halalas >= 0),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index orders_user_idx    on public.orders (user_id, created_at desc);
create index orders_status_idx  on public.orders (status, created_at desc);

create table public.order_items (
  id             bigint generated always as identity primary key,
  order_id       bigint not null references public.orders(id) on delete cascade,
  menu_item_id   bigint not null references public.menu_items(id) on delete restrict,
  name_en        text not null,
  name_ar        text not null,
  qty            integer not null check (qty > 0),
  unit_halalas   integer not null check (unit_halalas > 0),
  notes          text
);

create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id                  bigint generated always as identity primary key,
  order_id            bigint not null references public.orders(id) on delete cascade,
  moyasar_payment_id  text not null unique,
  amount_halalas      integer not null check (amount_halalas >= 0),
  status              text not null,
  raw                 jsonb not null,
  created_at          timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);

-- ---------- Row-Level Security ----------

alter table public.profiles    enable row level security;
alter table public.user_roles  enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;
alter table public.payments    enable row level security;

-- profiles: a user can read/update their own row; staff can read all.
create policy "Read own profile"
  on public.profiles for select
  using (id = auth.uid() or public.is_staff());

create policy "Update own profile"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- user_roles: a user can see their own roles; staff can see all.
create policy "Read own roles"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_staff());

-- orders: customers see their own; staff see all. Writes via service role only.
create policy "Read own orders"
  on public.orders for select
  using (user_id = auth.uid() or public.is_staff());

create policy "Read items of own orders"
  on public.order_items for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_staff())
    )
  );

create policy "Read payments of own orders"
  on public.payments for select
  using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id
        and (o.user_id = auth.uid() or public.is_staff())
    )
  );
