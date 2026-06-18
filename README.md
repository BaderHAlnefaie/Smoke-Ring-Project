# Smoke Ring

Bilingual (Arabic / English) order-ahead storefront for a food truck. Customers
browse the menu, build a cart, pay with [Moyasar](https://moyasar.com), and track
their order live; staff run the kitchen from a board that drives each order
through its lifecycle.

- **Framework:** Next.js 16 (App Router, Turbopack), React 19
- **Backend:** Supabase (Postgres + Auth + RLS)
- **Payments:** Moyasar hosted invoices + webhook
- **State:** Zustand (cart), Zod (validation)
- **Styling:** Tailwind CSS 4

> Money is stored as **integer halalas** (1 SAR = 100 halalas) everywhere — never
> floats. Prices are always recomputed server-side from the database; the client
> only ever sends item ids and quantities.

## Prerequisites

- **Node.js ≥ 20** (Next 16 requirement)
- A Supabase project
- A Moyasar account (test keys are fine for development)

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   ```

   Fill in the values (see comments in the file):

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (also whitelists menu image host) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Server-only; bypasses RLS. Never expose to the browser |
   | `NEXT_PUBLIC_SITE_URL` | Public origin for payment callbacks. **Required in production** |
   | `AUTH_FALLBACK_EMAIL` | `true` to use email magic-link instead of phone OTP (handy in dev) |
   | `MOYASAR_SECRET_KEY` | Moyasar secret key (server-only) |
   | `MOYASAR_WEBHOOK_SECRET` | Shared secret configured on the Moyasar webhook |
   | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM` | Optional. Enable "order ready" SMS. If unset, notifications are still recorded + logged |

3. **Run the database migrations**

   Apply everything in `supabase/migrations/` in order, via the Supabase SQL
   editor or the CLI:

   ```bash
   supabase db push        # with the Supabase CLI linked to your project
   ```

   Migrations:
   - `0001_init` — categories, menu items, truck status, public-read RLS, seed menu
   - `0002_orders` — profiles, roles, orders, order items, payments, RLS
   - `0003_orders_moyasar_invoice_id` — invoice id on orders for webhook resolution
   - `0004_rpcs_lifecycle_ratelimit` — transactional `create_order`, the
     `advance_order_status` state machine, and the rate limiter
   - `0005_truck_gating_and_notifications` — truck open/closed enforcement inside
     `create_order`, plus the `notifications` table

4. **Configure the Moyasar webhook**

   Point a webhook at `https://<your-domain>/api/webhooks/moyasar` and set its
   shared secret to the same value as `MOYASAR_WEBHOOK_SECRET`. The endpoint
   verifies the token (constant-time), records the payment once (idempotent), and
   **only marks an order paid when the reported amount matches the order total**.

5. **Run it**

   ```bash
   npm run dev
   ```

   Open http://localhost:3000 — you'll be redirected to your browser's preferred
   locale (`/en` or `/ar`).

## Granting staff access

The kitchen board at `/<lang>/staff` is gated to users with the `staff` or
`admin` role. After a user has signed in at least once, grant the role in SQL:

```sql
insert into public.user_roles (user_id, role)
values ('<auth-user-uuid>', 'staff')
on conflict do nothing;
```

Find the UUID in Supabase → Authentication → Users.

Staff/admin users get two extra screens:

- **`/<lang>/staff`** — the live kitchen board. Advance orders through
  `preparing → ready → picked_up` or cancel them. Marking an order *ready* sends
  the customer an "order ready" notification.
- **`/<lang>/admin`** — manage the menu (prices, availability / 86 an item) and
  the truck (open/closed, accepting scheduled orders, estimated wait) without SQL.

## Truck availability

`create_order` enforces truck status server-side: ASAP orders are rejected when
the truck is closed, and scheduled orders when it isn't accepting them. The
storefront also disables checkout and shows the estimated wait. Toggle all of
this from the admin console.

## Order lifecycle

```
pending_payment ──(webhook: paid)──▶ paid ──▶ preparing ──▶ ready ──▶ picked_up
       │                               │           │           │
       └───────────────────────────── cancelled ◀─┴───────────┘
```

Transitions past `paid` are driven by staff from the board and validated in the
`advance_order_status` RPC, so an illegal jump is rejected even if the UI is
bypassed.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (also runs the TypeScript type check) |
| `npm start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Run the Vitest unit suite |
| `npm run test:watch` | Vitest in watch mode |

## Testing & CI

Unit tests cover the money math and the Moyasar webhook logic (status mapping,
secret stripping, amount verification). CI (`.github/workflows/ci.yml`) runs
lint, tests, and a build on every push and pull request.

## Deploying

Deploy on Vercel (or any Node 20+ host). Set all environment variables in the
host, set `NEXT_PUBLIC_SITE_URL` to the production origin, and point the Moyasar
webhook at the deployed `/api/webhooks/moyasar` endpoint.
