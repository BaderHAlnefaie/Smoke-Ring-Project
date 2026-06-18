import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";
import { createPendingOrder } from "@/lib/db/orders";
import { createInvoice } from "@/lib/moyasar/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, defaultLocale } from "@/app/[lang]/dictionaries";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { log } from "@/lib/log";

const Body = z.object({
  lang: z.string().optional(),
  items: z
    .array(
      z.object({
        itemId: z.number().int().positive(),
        qty: z.number().int().min(1).max(99),
        notes: z.string().trim().max(280).optional(),
      }),
    )
    .min(1, "Cart is empty")
    .max(50),
  pickupType: z.enum(["asap", "scheduled"]).optional(),
  // ISO timestamp; only used when pickupType === "scheduled".
  scheduledFor: z.string().datetime().optional(),
});

/**
 * Origin used to build the Moyasar callback URL. In production NEXT_PUBLIC_SITE_URL
 * is required — trusting the inbound Host header would let an attacker steer the
 * post-payment redirect. Only dev falls back to the request host.
 */
function siteUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL is required in production");
  }
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Per-user + per-IP limit: caps Moyasar invoice creation abuse.
  const ip = clientIp(req.headers);
  const allowed = await rateLimit(`orders:${user.id}`, { max: 10, windowSeconds: 60 });
  const ipAllowed = await rateLimit(`orders-ip:${ip}`, { max: 30, windowSeconds: 60 });
  if (!allowed || !ipAllowed) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { items, pickupType, scheduledFor } = parsed.data;
  const lang = parsed.data.lang && isLocale(parsed.data.lang) ? parsed.data.lang : defaultLocale;

  if (pickupType === "scheduled" && !scheduledFor) {
    return NextResponse.json({ error: "scheduled_time_required" }, { status: 400 });
  }

  let created;
  try {
    created = await createPendingOrder(user.id, items, {
      pickupType: pickupType ?? "asap",
      scheduledFor: pickupType === "scheduled" ? scheduledFor : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  let base: string;
  try {
    base = siteUrl(req);
  } catch (err) {
    log.error("orders_site_url_missing", {
      message: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  let invoice;
  try {
    invoice = await createInvoice({
      amountHalalas: created.order.total_halalas,
      description: `Smoke Ring order #${created.order.id}`,
      callbackUrl: `${base}/${lang}/order/${created.order.id}`,
      metadata: {
        order_id: String(created.order.id),
        user_id: user.id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "moyasar_failed";
    log.error("orders_invoice_failed", { orderId: created.order.id, message });
    return NextResponse.json(
      { error: "payment_failed", detail: message, orderId: created.order.id },
      { status: 502 },
    );
  }

  // Persist invoice id so the webhook can resolve the order from data.invoice_id.
  const { error: updateErr } = await createAdminClient()
    .from("orders")
    .update({ moyasar_invoice_id: invoice.id })
    .eq("id", created.order.id);
  if (updateErr) {
    // Non-fatal: the webhook can still resolve via metadata.order_id.
    log.warn("orders_invoice_id_persist_failed", {
      orderId: created.order.id,
      message: updateErr.message,
    });
  }

  return NextResponse.json({
    orderId: created.order.id,
    paymentUrl: invoice.url,
    invoiceId: invoice.id,
  });
}
