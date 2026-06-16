"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@/lib/db/types";

type Props = {
  orderId: number;
  initialStatus: OrderStatus;
  statusLabel: string;
  states: Record<OrderStatus, string>;
};

const TERMINAL: OrderStatus[] = ["picked_up", "cancelled"];

function badgeClass(status: OrderStatus): string {
  if (status === "paid" || status === "preparing" || status === "ready") {
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200";
  }
  if (status === "cancelled") {
    return "bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200";
  }
  return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
}

/**
 * Polls the order status while it's still in flight and updates the badge live,
 * so a customer who just paid sees "Paid" without manually refreshing. Stops
 * polling once the order reaches a terminal state. Refreshes the route on change
 * so server-rendered details (e.g. totals) stay in sync.
 */
export function OrderStatusLive({ orderId, initialStatus, statusLabel, states }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const stopped = useRef(false);

  useEffect(() => {
    if (TERMINAL.includes(initialStatus)) return;
    stopped.current = false;

    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, {
          cache: "no-store",
        });
        if (res.ok) {
          const data = (await res.json()) as { status?: OrderStatus };
          if (data.status && data.status !== status) {
            setStatus(data.status);
            router.refresh();
          }
          if (data.status && TERMINAL.includes(data.status)) {
            stopped.current = true;
          }
        }
      } catch {
        // transient — keep polling
      }
      if (!stopped.current) timer = setTimeout(tick, 4000);
    };
    timer = setTimeout(tick, 4000);
    return () => {
      stopped.current = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, initialStatus]);

  return (
    <div className={`rounded-lg px-4 py-3 text-sm font-medium ${badgeClass(status)}`}>
      {statusLabel}: <span aria-live="polite">{states[status]}</span>
    </div>
  );
}
