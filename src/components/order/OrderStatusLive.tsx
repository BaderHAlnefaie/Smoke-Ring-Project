"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FoodIcon, type IconName } from "@/components/icons/FoodIcon";
import type { OrderStatus } from "@/lib/db/types";

type Props = {
  orderId: number;
  initialStatus: OrderStatus;
  states: Record<OrderStatus, string>;
  iconName: IconName;
  nowLabel: string;
};

const STEPS: OrderStatus[] = ["paid", "preparing", "ready", "picked_up"];
const TERMINAL: OrderStatus[] = ["picked_up", "cancelled"];

/**
 * Polls the order status every 4s while it's in flight and drives both the hero
 * label and the vertical stepper's "current" node, so a customer sees progress
 * without refreshing. Stops once the order reaches a terminal state.
 */
export function OrderStatusLive({
  orderId,
  initialStatus,
  states,
  iconName,
  nowLabel,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const stopped = useRef(false);

  useEffect(() => {
    if (TERMINAL.includes(initialStatus)) return;
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: "no-store" });
        if (res.ok) {
          const data = (await res.json()) as { status?: OrderStatus };
          if (data.status && data.status !== status) {
            setStatus(data.status);
            router.refresh();
          }
          if (data.status && TERMINAL.includes(data.status)) stopped.current = true;
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

  const cancelled = status === "cancelled";
  const ready = status === "ready" || status === "picked_up";
  const idx = STEPS.indexOf(status);
  const live = !TERMINAL.includes(status) && !cancelled;

  const ringFg = cancelled ? "#9c3b22" : ready ? "#6e8b5b" : "#c2622c";
  const ringBg = cancelled ? "#f6e2dc" : ready ? "#eef2e6" : "#fbe9cc";

  return (
    <div>
      <div className="my-8 text-center">
        <div
          className="relative mx-auto mb-4 flex items-center justify-center rounded-full"
          style={{ width: 104, height: 104, background: ringBg, color: ringFg }}
        >
          <FoodIcon name={iconName} size={46} />
          {live && (
            <span
              className="sr-pulse absolute rounded-full bg-ember"
              style={{ top: 12, insetInlineEnd: 14, width: 13, height: 13 }}
            />
          )}
        </div>
        <div className="font-serif text-3xl" aria-live="polite">
          {states[status]}
        </div>
      </div>

      {cancelled ? (
        <div className="rounded-[22px] border border-rust/20 bg-rust/5 px-5 py-5 text-center text-sm font-semibold text-rust">
          {states.cancelled}
        </div>
      ) : (
        <div className="rounded-[22px] border border-line bg-panel px-5">
          {STEPS.map((st, i) => {
            const done = idx >= 0 && i < idx;
            const current = i === idx;
            return (
              <div
                key={st}
                className="flex items-center gap-4 border-b border-line-soft py-4 last:border-b-0"
              >
                {done ? (
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-sage text-sm text-white">
                    ✓
                  </span>
                ) : current ? (
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ember">
                    <span className="h-2.5 w-2.5 rounded-full bg-cream" />
                  </span>
                ) : (
                  <span className="h-7 w-7 flex-none rounded-full border-2 border-line bg-panel" />
                )}
                <span
                  className={`text-[15px] ${
                    current
                      ? "font-bold text-ink"
                      : done
                        ? "font-semibold text-ink"
                        : "text-faint"
                  }`}
                >
                  {states[st]}
                </span>
                {current && live && (
                  <span className="ms-auto text-[13px] font-semibold text-ember">{nowLabel}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
