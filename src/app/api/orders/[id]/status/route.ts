import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/dal";
import { fetchOrderStatusForUser } from "@/lib/db/orders";

/**
 * Lightweight status endpoint the order page polls while an order is in flight.
 * Scoped to the authenticated user — you can only read your own order's status.
 */
export async function GET(
  _req: NextRequest,
  ctx: RouteContext<"/api/orders/[id]/status">,
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const status = await fetchOrderStatusForUser(orderId, user.id);
  if (!status) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({ status });
}
