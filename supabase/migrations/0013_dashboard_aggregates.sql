-- 0013 — Push admin-dashboard aggregation into SQL + add supporting indexes.
--
-- fetchDashboard() previously pulled up to 2000 of today's orders into Node and
-- reduced them in JS for counts/revenue/avg-prep, and derived "top sellers" from
-- only the most recent 40 orders. Past 2000 orders/day the cap silently made the
-- KPIs WRONG, and top-sellers was never a true daily figure. These RPCs compute
-- the numbers in Postgres over the full day with no row cap.

-- Index the dashboard's "today" scan and the completed-today count.
create index if not exists orders_created_idx
  on public.orders (created_at desc);

create index if not exists orders_pickedup_updated_idx
  on public.orders (updated_at)
  where status = 'picked_up';

-- KPIs: orders/revenue/avg-prep over today (created_at >= p_since), plus the
-- all-time active count (not capped, unlike the old 40-row derivation).
create or replace function public.admin_dashboard_stats(p_since timestamptz)
returns table (
  orders_today          bigint,
  revenue_today_halalas bigint,
  avg_prep_mins         numeric,
  active_now            bigint
)
language sql
security definer
set search_path = public
as $$
  with today as (
    select total_halalas, status, created_at, updated_at
    from public.orders
    where created_at >= p_since
  )
  select
    count(*) filter (
      where status not in ('cancelled', 'pending_payment')
    )::bigint as orders_today,
    coalesce(sum(total_halalas) filter (
      where status not in ('cancelled', 'pending_payment')
    ), 0)::bigint as revenue_today_halalas,
    round(avg(
      extract(epoch from (updated_at - created_at)) / 60.0
    ) filter (
      where status in ('ready', 'picked_up')
        and extract(epoch from (updated_at - created_at)) / 60.0 between 0 and 300
    )) as avg_prep_mins,
    (select count(*) from public.orders
       where status in ('paid', 'preparing', 'ready'))::bigint as active_now
  from today;
$$;

-- True daily top sellers: sum quantities across all of today's countable orders.
create or replace function public.admin_top_sellers(p_since timestamptz, p_limit integer default 5)
returns table (name_en text, name_ar text, qty bigint)
language sql
security definer
set search_path = public
as $$
  select oi.name_en, oi.name_ar, sum(oi.qty)::bigint as qty
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  where o.created_at >= p_since
    and o.status not in ('cancelled', 'pending_payment')
  group by oi.name_en, oi.name_ar
  order by qty desc
  limit greatest(p_limit, 0);
$$;

-- Service-role only (called from the admin client), consistent with the 0010 lockdown.
revoke all on function public.admin_dashboard_stats(timestamptz) from public, anon, authenticated;
revoke all on function public.admin_top_sellers(timestamptz, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard_stats(timestamptz) to service_role;
grant execute on function public.admin_top_sellers(timestamptz, integer) to service_role;
