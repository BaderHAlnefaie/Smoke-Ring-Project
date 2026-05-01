-- Smoke Ring — initial schema (Phase 1)
-- Tables: categories, menu_items, truck_status
-- Run this once in Supabase Studio → SQL Editor.
-- Money is stored as integer halalas (1 SAR = 100 halalas) — never floats.

-- ---------- Tables ----------

create table public.categories (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  name_en     text not null,
  name_ar     text not null,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table public.menu_items (
  id              bigint generated always as identity primary key,
  category_id     bigint not null references public.categories(id) on delete restrict,
  slug            text not null unique,
  name_en         text not null,
  name_ar         text not null,
  description_en  text,
  description_ar  text,
  price_halalas   integer not null check (price_halalas > 0),
  image_url       text,
  is_available    boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index menu_items_category_idx
  on public.menu_items (category_id, sort_order);

-- Singleton: exactly one row, id always 1.
create table public.truck_status (
  id                   smallint primary key default 1,
  is_open              boolean not null default false,
  est_wait_minutes     integer not null default 0,
  accepting_scheduled  boolean not null default false,
  updated_at           timestamptz not null default now(),
  constraint truck_status_singleton check (id = 1)
);

insert into public.truck_status (id) values (1);

-- ---------- Row-Level Security ----------
-- Phase 1: public reads for menu data; writes require the service role
-- (no policy = denied for anon and authenticated users).

alter table public.categories  enable row level security;
alter table public.menu_items  enable row level security;
alter table public.truck_status enable row level security;

create policy "Anyone can read categories"
  on public.categories for select using (true);

create policy "Anyone can read menu items"
  on public.menu_items for select using (true);

create policy "Anyone can read truck status"
  on public.truck_status for select using (true);

-- ---------- Seed (placeholder menu) ----------

insert into public.categories (slug, name_en, name_ar, sort_order) values
  ('burgers', 'Burgers',  'برغر',     10),
  ('sides',   'Sides',    'إضافات',    20),
  ('drinks',  'Drinks',   'مشروبات',   30);

insert into public.menu_items
  (category_id, slug, name_en, name_ar, description_en, description_ar, price_halalas, sort_order)
values
  ((select id from public.categories where slug = 'burgers'),
   'classic-smoke-burger', 'Classic Smoke Burger', 'برغر سموك كلاسيكي',
   'Smoked beef patty, cheddar, lettuce, smoke sauce.',
   'لحم بقري مدخن، شيدر، خس، صوص الدخان.',
   3500, 10),
  ((select id from public.categories where slug = 'burgers'),
   'double-smoke-burger', 'Double Smoke Burger', 'دبل برغر سموك',
   'Two smoked patties, double cheddar, smoke sauce.',
   'قطعتان من اللحم المدخن، شيدر مضاعف، صوص الدخان.',
   4500, 20),
  ((select id from public.categories where slug = 'sides'),
   'smoked-fries', 'Smoked Fries', 'بطاطس مدخنة',
   'Hand-cut fries with smoked paprika.',
   'بطاطس مقطعة يدويًا مع البابريكا المدخنة.',
   1500, 10),
  ((select id from public.categories where slug = 'drinks'),
   'cola', 'Cola', 'كولا',
   null, null,
   800, 10),
  ((select id from public.categories where slug = 'drinks'),
   'water', 'Water', 'ماء',
   null, null,
   300, 20);

-- Open the truck for testing.
update public.truck_status
set is_open = true, est_wait_minutes = 10
where id = 1;
