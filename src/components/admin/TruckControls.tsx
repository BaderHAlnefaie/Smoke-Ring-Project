"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Toggle } from "./Toggle";
import { setTruckOpen, setTruckScheduled, setTruckWait } from "@/app/[lang]/admin/actions";
import type { Dictionary, Locale } from "@/app/[lang]/dictionaries";

type Props = {
  open: boolean;
  scheduled: boolean;
  wait: number;
  lang: Locale;
  dict: Dictionary;
};

export function TruckControls({ open, scheduled, wait, lang, dict }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const a = dict.admin;
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      await fn();
      router.refresh();
    });

  const rowStyle = { borderTop: "1px solid #f1e8d6" };

  return (
    <div className="rounded-[18px] border p-[22px]" style={{ background: "#fffefb", borderColor: "#ece1cc" }}>
      <h2 className="font-serif text-xl">{a.serviceStatus}</h2>
      <p className="mb-[18px] mt-1 text-[13.5px]" style={{ color: "#8a7c6b" }}>{a.serviceSub}</p>

      <div className="flex items-center justify-between py-[15px]" style={rowStyle}>
        <div>
          <div className="text-[15px] font-semibold">{a.openForOrders}</div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: "#a99b86" }}>{open ? a.openTaking : a.closed}</div>
        </div>
        <Toggle on={open} disabled={pending} onClick={() => run(() => setTruckOpen(!open, lang))} label={a.openForOrders} />
      </div>

      <div className="flex items-center justify-between py-[15px]" style={rowStyle}>
        <div>
          <div className="text-[15px] font-semibold">{a.acceptScheduled}</div>
          <div className="mt-0.5 text-[12.5px]" style={{ color: "#a99b86" }}>{a.acceptSchedSub}</div>
        </div>
        <Toggle on={scheduled} disabled={pending} onClick={() => run(() => setTruckScheduled(!scheduled, lang))} label={a.acceptScheduled} />
      </div>

      <div className="pt-[15px]" style={rowStyle}>
        <div className="mb-2.5 text-[15px] font-semibold">{a.estWaitTime}</div>
        <div className="flex items-center gap-3.5">
          <div className="flex items-center overflow-hidden rounded-xl border" style={{ borderColor: "#e0d4bd" }}>
            <button
              type="button"
              disabled={pending || wait <= 0}
              onClick={() => run(() => setTruckWait(wait - 5, lang))}
              className="h-11 w-[42px] text-[22px] disabled:opacity-50"
              style={{ background: "#faf3e4", color: "#c2622c" }}
            >
              −
            </button>
            <span className="text-lg font-bold tabular-nums" style={{ minWidth: 64, textAlign: "center" }}>{wait}</span>
            <button
              type="button"
              disabled={pending || wait >= 120}
              onClick={() => run(() => setTruckWait(wait + 5, lang))}
              className="h-11 w-[42px] text-[22px] disabled:opacity-50"
              style={{ background: "#faf3e4", color: "#c2622c" }}
            >
              +
            </button>
          </div>
          <span className="text-sm" style={{ color: "#8a7c6b" }}>{a.minutes}</span>
        </div>
      </div>
    </div>
  );
}
