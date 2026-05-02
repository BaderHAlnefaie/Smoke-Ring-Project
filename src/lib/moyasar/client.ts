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

  const res = await fetch(`${API_BASE}/invoices`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${secret}:`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Moyasar invoice failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as MoyasarInvoice;
  return data;
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
