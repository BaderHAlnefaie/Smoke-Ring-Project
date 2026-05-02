import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

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

export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.MOYASAR_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(signature, "hex");
  } catch {
    return false;
  }
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
