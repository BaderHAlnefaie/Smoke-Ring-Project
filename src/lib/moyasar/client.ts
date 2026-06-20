import "server-only";
import { timingSafeEqual } from "crypto";

const API_BASE = "https://api.moyasar.com/v1";

export type CreateInvoiceInput = {
  amountHalalas: number;
  description: string;
  callbackUrl: string;
  metadata?: Record<string, string>;
};

export type MoyasarInvoice = {
  id: string;
  url: string;
  status: string;
};

export async function createInvoice(
  input: CreateInvoiceInput,
): Promise<MoyasarInvoice> {
  const secret = process.env.MOYASAR_SECRET_KEY;
  if (!secret) throw new Error("MOYASAR_SECRET_KEY is not set");

  const body = new URLSearchParams();
  body.set("amount", String(input.amountHalalas));
  body.set("currency", "SAR");
  body.set("description", input.description);
  body.set("callback_url", input.callbackUrl);
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      body.set(`metadata[${k}]`, v);
    }
  }

  const reqHeaders = {
    Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };

  // Bounded retry: a slow/hung Moyasar must not hang checkout indefinitely, and
  // transient network/5xx errors shouldn't fail an otherwise-valid order. Never
  // retry a 4xx (our request is wrong — retrying won't help). Each attempt is
  // capped at 8s; no payment is created until the customer pays on the hosted
  // invoice, so a retried invoice creation can't double-charge anyone.
  const MAX_ATTEMPTS = 2;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/invoices`, {
        method: "POST",
        headers: reqHeaders,
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        return (await res.json()) as MoyasarInvoice;
      }

      const text = await res.text();
      const err = new Error(`Moyasar invoice failed (${res.status}): ${text}`);
      if (res.status < 500) throw err; // client error — not retryable
      lastErr = err; // 5xx — retry
    } catch (err) {
      // Non-retryable client errors bubble straight up.
      if (err instanceof Error && err.message.startsWith("Moyasar invoice failed (4")) {
        throw err;
      }
      lastErr = err; // timeout / network — retry
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error("Moyasar invoice failed after retries");
}

// Moyasar does not HMAC webhooks. The shared secret you configure in the
// dashboard is delivered as a `secret_token` field inside the JSON body.
// Verification = constant-time compare of that field against our env secret.
export function verifyWebhookToken(receivedToken: string | undefined | null): boolean {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret || !receivedToken) return false;
  const a = Buffer.from(secret, "utf8");
  const b = Buffer.from(receivedToken, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
