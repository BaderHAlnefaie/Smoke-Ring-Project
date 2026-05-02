import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookToken } from "@/lib/moyasar/client";
import type { OrderStatus } from "@/lib/db/types";

type MoyasarWebhookPayload = {
  type?: string;
  secret_token?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number;
    invoice_id?: string | null;
    metadata?: Record<string, string> | null;
  };
};

function nextStatusFor(eventType: string | undefined, paymentStatus: string | undefined): OrderStatus | null {
  const t = (eventType ?? "").toLowerCase();
  const s = (paymentStatus ?? "").toLowerCase();
  if (s === "paid" || t.includes("paid")) return "paid";
  if (s === "failed" || t.includes("failed")) return "cancelled";
  return null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  let payload: MoyasarWebhookPayload;
  try {
    payload = JSON.parse(raw) as MoyasarWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!verifyWebhookToken(payload.secret_token)) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }

  const moyasarPaymentId = payload.data?.id;
  const paymentStatus = payload.data?.status;
  const invoiceId = payload.data?.invoice_id ?? null;
  const metaOrderId = payload.data?.metadata?.order_id ?? null;
  const amount = payload.data?.amount ?? 0;

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
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

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
      raw: payload,
    });
    if (insertErr && !insertErr.message.includes("duplicate")) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }
  }

  const next = nextStatusFor(payload.type, paymentStatus);
  if (next) {
    const { data: order } = await admin
      .from("orders")
      .select("status")
      .eq("id", orderId)
      .maybeSingle();

    if (order && order.status === "pending_payment") {
      const { error: updateErr } = await admin
        .from("orders")
        .update({ status: next, updated_at: new Date().toISOString() })
        .eq("id", orderId)
        .eq("status", "pending_payment");
      if (updateErr) {
        return NextResponse.json({ error: updateErr.message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
