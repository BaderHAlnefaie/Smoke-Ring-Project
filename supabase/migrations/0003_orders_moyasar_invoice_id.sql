-- Phase 2 fix: Moyasar payment webhooks carry invoice_id but do NOT copy
-- invoice metadata onto the payment object. Store invoice id on the order
-- so the webhook can resolve the order without a Moyasar API round-trip.

alter table public.orders
  add column moyasar_invoice_id text;

create unique index orders_moyasar_invoice_id_key
  on public.orders (moyasar_invoice_id)
  where moyasar_invoice_id is not null;
