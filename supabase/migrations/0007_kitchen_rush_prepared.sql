-- Smoke Ring — Kitchen Display System fields
--
-- Two kitchen-local flags so the staff board persists across devices:
--   orders.is_rush       — line cook flagged this order to jump its lane
--   order_items.prepared — per-item "done" checkoff on the kitchen card
--
-- Both are written only via the service-role staff actions (RLS already limits
-- order writes to the service role), so no new policies are needed.

alter table public.orders
  add column if not exists is_rush boolean not null default false;

alter table public.order_items
  add column if not exists prepared boolean not null default false;
