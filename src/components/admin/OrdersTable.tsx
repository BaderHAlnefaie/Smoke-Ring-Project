"use client";

import { useState } from "react";
import { StatusBadge } from "@/components/order/StatusBadge";
import type { OrderStatus } from "@/lib/db/types";
import type { Dictionary } from "@/app/[lang]/dictionaries";

export type OrderRow = {
  id: number;
  time: string;
  summary: string;
  pickupLabel: string;
  pickupSub: string;
  total: string;
  status: OrderStatus;
  statusLabel: string;
};

type FilterKey = "all" | "active" | "ready" | "completed";

const TEST: Record<FilterKey, (s: OrderStatus) => boolean> = {
  all: () => true,
  active: (s) => s === "paid" || s === "preparing" || s === "pending_payment",
  ready: (s) => s === "ready",
  completed: (s) => s === "picked_up" || s === "cancelled",
};

export function OrdersTable({ rows, dict }: { rows: OrderRow[]; dict: Dictionary }) {
  const [filter, setFilter] = useState<FilterKey>("active");
  const a = dict.admin;
  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: a.filterAll },
    { key: "active", label: a.filterActive },
    { key: "ready", label: a.filterReady },
    { key: "completed", label: a.filterCompleted },
  ];
  const shown = rows.filter((r) => TEST[filter](r.status));

  return (
    <div>
      <div className="mb-[18px] flex gap-2">
        {filters.map((f) => {
          const active = filter === f.key;
          const count = rows.filter((r) => TEST[f.key](r.status)).length;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className="rounded-full border px-3.5 py-2 text-[13.5px] font-semibold"
              style={
                active
                  ? { background: "#c2622c", borderColor: "#c2622c", color: "#fbf5e9" }
                  : { background: "#fffefb", borderColor: "#e2d6bf", color: "#6f6152" }
              }
            >
              {f.label} · {count}
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-[18px] border" style={{ background: "#fffefb", borderColor: "#ece1cc" }}>
        <div
          className="flex items-center gap-3.5 px-[22px] py-3 text-[11.5px] font-bold uppercase tracking-wider"
          style={{ background: "#faf3e4", borderBottom: "1px solid #ece1cc", color: "#a99b86" }}
        >
          <span style={{ minWidth: 88 }}>{a.colOrder}</span>
          <span className="flex-1">{a.colItems}</span>
          <span style={{ minWidth: 96 }}>{a.colPickup}</span>
          <span className="text-end" style={{ minWidth: 78 }}>{a.colTotal}</span>
          <span className="text-center" style={{ minWidth: 110 }}>{a.colStatus}</span>
        </div>

        {shown.length === 0 ? (
          <p className="px-[22px] py-10 text-center text-sm" style={{ color: "#a99b86" }}>{dict.staff.empty}</p>
        ) : (
          shown.map((r) => (
            <div key={r.id} className="flex items-center gap-3.5 px-[22px] py-[15px]" style={{ borderBottom: "1px solid #f1e8d6" }}>
              <div style={{ minWidth: 88 }}>
                <div className="text-sm font-bold tabular-nums">#{r.id}</div>
                <div className="text-xs" style={{ color: "#a99b86" }}>{r.time}</div>
              </div>
              <div className="min-w-0 flex-1 truncate text-[13.5px]" style={{ color: "#5a4d3f" }}>{r.summary}</div>
              <div style={{ minWidth: 96 }}>
                <div className="text-[13.5px] font-medium">{r.pickupLabel}</div>
                <div className="text-xs" style={{ color: "#a99b86" }}>{r.pickupSub}</div>
              </div>
              <span className="text-end text-[14.5px] font-semibold tabular-nums" style={{ minWidth: 78 }}>{r.total}</span>
              <div className="flex justify-center" style={{ minWidth: 110 }}>
                <StatusBadge status={r.status} label={r.statusLabel} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
