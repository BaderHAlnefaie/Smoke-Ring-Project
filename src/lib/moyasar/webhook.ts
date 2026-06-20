import type { OrderStatus } from "@/lib/db/types";

export type MoyasarWebhookData = {
  id?: string;
  status?: string;
  amount?: number;
  currency?: string;
  invoice_id?: string | null;
  metadata?: Record<string, string> | null;
};

/** The only currency we ever charge in. Invoices are created as SAR (see client.ts). */
export const EXPECTED_CURRENCY = "SAR";

export type MoyasarWebhookPayload = {
  type?: string;
  secret_token?: string;
  data?: MoyasarWebhookData;
};

/**
 * Map a Moyasar event to the next order status, or null if it shouldn't change.
 * Pure so it can be unit-tested without a request.
 */
export function nextStatusFor(
  eventType: string | undefined,
  paymentStatus: string | undefined,
): OrderStatus | null {
  const t = (eventType ?? "").toLowerCase();
  const s = (paymentStatus ?? "").toLowerCase();
  if (s === "paid" || t.includes("paid")) return "paid";
  if (s === "failed" || t.includes("failed")) return "cancelled";
  return null;
}

/**
 * Remove the shared secret (and any auth-ish fields) before the payload is
 * persisted to payments.raw — otherwise the webhook secret ends up in plaintext
 * in the database on every payment row.
 */
export function stripSecretToken(payload: MoyasarWebhookPayload): MoyasarWebhookPayload {
  const clone = { ...payload };
  delete clone.secret_token;
  return clone;
}

/**
 * Decide whether a "paid" transition is trustworthy. We only mark an order paid
 * when BOTH the currency is the one we charge in (SAR) AND the amount Moyasar
 * reports matches the order total we computed server-side. Without the currency
 * check, a payment in another currency whose integer "amount" happens to equal
 * the halala total (e.g. a foreign minor-unit amount) would pass the bare amount
 * comparison and underpay. A mismatch (wrong currency, under/overpayment,
 * tampering) is recorded but must NOT flip status.
 */
export function isAmountTrusted(
  next: OrderStatus | null,
  paidAmountHalalas: number,
  orderTotalHalalas: number,
  currency: string | undefined,
): boolean {
  if (next !== "paid") return true; // cancellations don't depend on amount
  if ((currency ?? "").toUpperCase() !== EXPECTED_CURRENCY) return false;
  return paidAmountHalalas === orderTotalHalalas;
}
