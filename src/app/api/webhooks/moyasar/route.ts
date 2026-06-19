import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookToken } from "@/lib/moyasar/client";
import {
  nextStatusFor,
  stripSecretToken,
  isAmountTrusted,
  type MoyasarWebhookPayload,
} from "@/lib/moyasar/webhook";
import { log } from "@/lib/log";

export async function POST(req: NextRequest) {
  const raw = await req.text();

  let payload: MoyasarWebhookPayload;
  try {
    payload = JSON.parse(raw) as MoyasarWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!verifyWebhookToken(payload.secret_token)) {
    log.warn("moyasar_webhook_bad_token", { type: payload.type });
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const moyasarPaymentId = payload.data?.id;
  const paymentStatus = payload.data?.status;
  const invoiceId = payload.data?.invoice_id ?? null;
  const metaOrderId = payload.data?.metadata?.order_id ?? null;
  const amount = payload.data?.amount ?? 0;
  const currency = payload.data?.currency;

  if (!moyasarPaymentId || (!invoiceId && !metaOrderId)) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Prefer metadata.order_id (set when Moyasar payments are created directly);
  // fall back to invoice_id lookup for the hosted-invoice flow.
  let orderId: number | null = null;
  if (metaOrderId) {
    const n = Number(metaOrderId);
    if (Number.isInteger(n) && n > 0) orderId = n;
  }
  if (orderId === null && invoiceId) {
    const { data: orderRow } = await admin
      .from("orders")
      .select("id")
      .eq("moyasar_invoice_id", invoiceId)
      .maybeSingle();
    if (orderRow) orderId = orderRow.id;
  }
  if (!orderId) {
    log.warn("moyasar_webhook_order_not_found", { invoiceId, metaOrderId });
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  // Load the order so we can verify the paid amount against what we charged.
  const { data: order } = await admin
    .from("orders")
    .select("status, total_halalas")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  // Record the payment exactly once (idempotent on moyasar_payment_id).
  // Strip the shared secret before persisting the raw payload to the DB.
  const { data: existing } = await admin
    .from("payments")
    .select("id")
    .eq("moyasar_payment_id", moyasarPaymentId)
    .maybeSingle();

  if (!existing) {
    const { error: insertErr } = await admin.from("payments").insert({
      order_id: orderId,
      moyasar_payment_id: moyasarPaymentId,
      amount_halalas: amount,
      status: paymentStatus ?? "unknown",
      raw: stripSecretToken(payload),
    });
    if (insertErr && !insertErr.message.includes("duplicate")) {
      log.error("moyasar_webhook_payment_insert_failed", {
        orderId,
        message: insertErr.message,
      });
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  const next = nextStatusFor(payload.type, paymentStatus);

  // Critical: never mark an order paid unless the amount matches the order total.
  if (next === "paid" && !isAmountTrusted(next, amount, order.total_halalas, currency)) {
    log.error("moyasar_webhook_amount_mismatch", {
      orderId,
      paymentId: moyasarPaymentId,
      expected: order.total_halalas,
      received: amount,
      currency: currency ?? null,
    });
    // Payment is recorded above; status intentionally left unchanged. Return 200
    // so Moyasar doesn't retry — this needs human review, not a retry storm.
    return NextResponse.json({ ok: true, status: "amount_mismatch" });
  }

  if (next && order.status === "pending_payment") {
    const { error: updateErr } = await admin
      .from("orders")
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", orderId)
      .eq("status", "pending_payment");
    if (updateErr) {
      log.error("moyasar_webhook_status_update_failed", {
        orderId,
        next,
        message: updateErr.message,
      });
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
    log.info("moyasar_webhook_status_advanced", { orderId, next });
  }

  return NextResponse.json({ ok: true });
}
