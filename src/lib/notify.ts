import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { log } from "@/lib/log";
import type { Order } from "@/lib/db/types";

/**
 * Customer notifications.
 *
 * Delivery is best-effort and fail-soft: a notification must never break the
 * status update that triggered it. Every attempt is recorded in the
 * `notifications` table (so there's an audit trail and an in-app feed later);
 * if Twilio credentials are configured we also send an SMS, otherwise we log.
 * Email is a future channel.
 */

type Channel = "sms" | "log";

async function sendSms(to: string, body: string): Promise<{ ok: boolean; detail?: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return { ok: false, detail: "twilio_not_configured" };

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ To: to, From: from, Body: body }),
        cache: "no-store",
      },
    );
    if (!res.ok) return { ok: false, detail: `twilio_${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : "twilio_error" };
  }
}

async function record(
  orderId: number,
  userId: string,
  type: string,
  channel: Channel,
  status: string,
  detail?: string,
) {
  try {
    await createAdminClient().from("notifications").insert({
      order_id: orderId,
      user_id: userId,
      type,
      channel,
      status,
      detail: detail ?? null,
    });
  } catch (err) {
    log.warn("notification_record_failed", {
      orderId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

/** Notify the customer that their order is ready for pickup. */
export async function notifyOrderReady(order: Order): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: profile } = await admin
      .from("profiles")
      .select("phone")
      .eq("id", order.user_id)
      .maybeSingle();

    const phone = profile?.phone ?? null;
    const body = `Smoke Ring: your order #${order.id} is ready for pickup. 🛎️`;

    if (phone) {
      const sms = await sendSms(phone, body);
      if (sms.ok) {
        await record(order.id, order.user_id, "order_ready", "sms", "sent");
        log.info("order_ready_notified", { orderId: order.id, channel: "sms" });
        return;
      }
      // SMS unavailable/failed — fall through to a logged record.
      await record(order.id, order.user_id, "order_ready", "log", "recorded", sms.detail);
      log.info("order_ready_notified", { orderId: order.id, channel: "log", detail: sms.detail });
      return;
    }

    await record(order.id, order.user_id, "order_ready", "log", "recorded", "no_phone");
    log.info("order_ready_notified", { orderId: order.id, channel: "log", detail: "no_phone" });
  } catch (err) {
    // Never let a notification failure bubble into the status update.
    log.warn("order_ready_notify_failed", {
      orderId: order.id,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}
