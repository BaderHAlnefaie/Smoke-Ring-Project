# Scaling roadmap

This app is built well for launch volume. This doc tracks the scaling work, what's
already done, and what to do at each growth milestone. It came out of a
pre-production scalability review.

## Done (PR: perf/scalability-hardening)

- **Dashboard aggregates in SQL** (`0013`, `src/lib/db/admin-stats.ts`). The old
  `fetchDashboard` pulled up to 2000 of today's orders into Node and reduced them
  in JS — past 2000 orders/day the KPIs were silently wrong, and "top sellers"
  was derived from only the last 40 orders. Now computed in Postgres over the full
  day with no cap, via `admin_dashboard_stats()` and `admin_top_sellers()`.
- **Supporting indexes** (`0013`): `orders (created_at desc)` for the dashboard's
  day scan, and a partial `orders (updated_at) where status = 'picked_up'` for
  `countCompletedToday()`.
- **`rate_limits` GC** (`0014`): `gc_rate_limits()` + a pg_cron schedule (every
  10 min). The table previously grew unbounded (one row per user/IP per 60s
  window) with the promised cleanup never implemented.

## Before ~1k orders/day

- **Switch the boards to Supabase Realtime.** Today both poll full server renders:
  the customer tracker (`OrderStatusLive.tsx`) hits `GET /api/orders/:id/status`
  every 4s, and the staff board (`StaffBoard.tsx`) calls `router.refresh()` every
  6s (re-running `fetchActiveOrdersForStaff` + `countCompletedToday` each tick).
  Polling cost is O(open clients) regardless of change rate. Realtime
  (`postgres_changes` on `orders`, filtered by `id` for the customer and `status`
  for staff) pushes only on change; RLS already scopes the subscriptions
  correctly (see policies in `0002`/`0005`). Biggest cost-at-scale win.
  - Interim mitigation if staying on polling: back the customer poll off to 8–10s
    and move `countCompletedToday` off the 6s staff path.
- **Verify the pooled connection string.** On Vercel (serverless) use Supabase's
  Supavisor/pgBouncer transaction-mode pooler (port 6543) for anything opening
  direct PG connections; confirm PostgREST's pool is sized for a lunch-rush burst.

## Before ~10k orders/day

- **Keyset pagination + server-side filters** on the order lists. `fetchOrdersForUser`
  caps at 100 with no "load more"; the admin orders page (`fetchAdminOrders(80)`)
  shows only the newest 80 with no status/date filter. Move to
  `created_at < cursor order by created_at desc limit N`, and turn the admin
  filter into a `WHERE` (`status = …`, `created_at between …`) — the
  `orders_status_idx (status, created_at desc)` already supports it.
- **Range-partition the append-only tables by month** (`created_at`): `orders`,
  `order_items`, `inventory_movements`, `notifications`. `pg_partman` is available
  on the project. Add a retention job to archive/drop old partitions —
  `notifications` and `inventory_movements` are audit logs, not hot data.
- **Consider a read replica** for the admin dashboard/reporting so analytics don't
  compete with order writes.

## Notes / smaller items

- `advance_order_status`' inventory consume loop updates a shared `inventory_items`
  row per ingredient — the one real contention point under burst. Fine for a single
  truck; if scaling to multiple locations, batch `sync_menu_availability_for_inventory`
  to once-per-consume and consider a movements-ledger + materialized stock total.
- The Moyasar webhook returns 404 on `order_not_found`; consider 200 + alert to
  avoid lost paid events / retry storms (tracked with the payment-hardening work).
