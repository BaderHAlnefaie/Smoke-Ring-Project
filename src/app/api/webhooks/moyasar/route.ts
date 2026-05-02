import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWebhookSignature } from "@/lib/moyasar/client";
import type { OrderStatus } from "@/lib/db/types";

type MoyasarWebhookPayload = {
  type?: string;
  data?: {
    id?: string;
    status?: string;
    amount?: number;
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
  const signature =
    req.headers.get("x-moyasar-signature") ?? req.headers.get("moyasar-signature");

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let payload: MoyasarWebhookPayload;
  try {
    payload = JSON.parse(raw) as MoyasarWebhookPayload;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const moyasarPaymentId = payload.data?.id;
  const paymentStatus = payload.data?.status;
  const orderIdRaw = payload.data?.metadata?.order_id;
  const amount = payload.data?.amount ?? 0;

  if (!moyasarPaymentId || !orderIdRaw) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  const orderId = Number(orderIdRaw);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "bad_order_id" }, { status: 400 });
  }

  const admin = createAdminClient();

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
