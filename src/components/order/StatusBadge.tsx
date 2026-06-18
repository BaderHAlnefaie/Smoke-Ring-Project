import type { OrderStatus } from "@/lib/db/types";

/** Order-status chip colors, from the brunch design handoff. */
export const STATUS_META: Record<OrderStatus, { bg: string; color: string; dot: string }> = {
  pending_payment: { bg: "#fbefd3", color: "#8a6a1f", dot: "#d9a82b" },
  paid: { bg: "#e7eef4", color: "#33597d", dot: "#3f6fa0" },
  preparing: { bg: "#fbe9cc", color: "#a8501f", dot: "#c2622c" },
  ready: { bg: "#eef2e6", color: "#42562f", dot: "#6e8b5b" },
  picked_up: { bg: "#efeae0", color: "#8a7c6b", dot: "#a99b86" },
  cancelled: { bg: "#f6e2dc", color: "#9c3b22", dot: "#c2502c" },
};

export function StatusBadge({ status, label }: { status: OrderStatus; label: string }) {
  const m = STATUS_META[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-semibold"
      style={{ background: m.bg, color: m.color }}
    >
      <span className="h-[7px] w-[7px] rounded-full" style={{ background: m.dot }} />
      {label}
    </span>
  );
}
