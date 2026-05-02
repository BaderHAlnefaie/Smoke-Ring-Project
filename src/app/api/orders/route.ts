import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/dal";
import { createPendingOrder } from "@/lib/db/orders";
import { createInvoice } from "@/lib/moyasar/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, defaultLocale } from "@/app/[lang]/dictionaries";

const Body = z.object({
  lang: z.string().optional(),
  items: z
    .array(z.object({ itemId: z.number().int().positive(), qty: z.number().int().min(1).max(99) }))
    .min(1, "Cart is empty")
    .max(50),
});

function siteUrl(req: NextRequest) {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

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

  const lang = parsed.data.lang && isLocale(parsed.data.lang) ? parsed.data.lang : defaultLocale;

  let created;
  try {
    created = await createPendingOrder(user.id, parsed.data.items);
  } catch (err) {
    const message = err instanceof Error ? err.message : "create_failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const base = siteUrl(req);
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
    return NextResponse.json(
      { error: "payment_failed", detail: message, orderId: created.order.id },
      { status: 502 },
    );
  }

  // Persist invoice id so the webhook can resolve the order from data.invoice_id.
  await createAdminClient()
    .from("orders")
    .update({ moyasar_invoice_id: invoice.id })
    .eq("id", created.order.id);

  return NextResponse.json({
    orderId: created.order.id,
    paymentUrl: invoice.url,
    invoiceId: invoice.id,
  });
}
