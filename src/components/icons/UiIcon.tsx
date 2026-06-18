import type { SVGProps } from "react";

/** Monoline UI icons (controls/affordances), ported from the design mockups. */
export type UiIconName =
  | "flame"
  | "bell"
  | "bellOff"
  | "clock"
  | "plus"
  | "pencil"
  | "grid"
  | "receipt"
  | "bowl"
  | "truck"
  | "users"
  | "coins";

const PATHS: Record<UiIconName, React.ReactNode> = {
  grid: (
    <>
      <rect x={3} y={3} width={7} height={7} rx={2} />
      <rect x={14} y={3} width={7} height={7} rx={2} />
      <rect x={3} y={14} width={7} height={7} rx={2} />
      <rect x={14} y={14} width={7} height={7} rx={2} />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3 h12 v18 l-3 -2 -3 2 -3 -2 -3 2 Z" />
      <path d="M9 8 h6 M9 12 h6" />
    </>
  ),
  bowl: (
    <>
      <path d="M3 11 h18 a9 9 0 0 1 -18 0 Z" />
      <path d="M12 4 v3 M9 5 v2 M15 5 v2" />
    </>
  ),
  truck: (
    <>
      <rect x={1.5} y={6} width={12} height={9} rx={1.5} />
      <path d="M13.5 9 h3.5 l3 3 v3 h-6.5 Z" />
      <circle cx={6} cy={18} r={2} />
      <circle cx={17} cy={18} r={2} />
    </>
  ),
  users: (
    <>
      <circle cx={9} cy={8} r={3} />
      <path d="M3.5 20 a5.5 5.5 0 0 1 11 0" />
      <circle cx={17} cy={9} r={2.2} />
      <path d="M16 20 a4.5 4.5 0 0 1 5.5 -4" />
    </>
  ),
  coins: (
    <>
      <ellipse cx={12} cy={7} rx={7} ry={3} />
      <path d="M5 7 v5 c0 1.7 3.1 3 7 3 s7 -1.3 7 -3 V7" />
      <path d="M5 12 v5 c0 1.7 3.1 3 7 3 s7 -1.3 7 -3 v-5" />
    </>
  ),
  flame: (
    <path d="M12 3 c3.5 3.5 5 6 5 9.5 a5 5 0 0 1 -10 0 c0 -2 1 -3.2 2.2 -4.2 c-.2 1.8 .8 3 2 3 c1.2 0 -1 -4.3 -1.2 -8.3 Z" />
  ),
  bell: (
    <>
      <path d="M6 9 a6 6 0 0 1 12 0 c0 5 2 6 2 6 H4 s2 -1 2 -6" />
      <path d="M10 19 a2 2 0 0 0 4 0" />
    </>
  ),
  bellOff: (
    <>
      <path d="M6 9 a6 6 0 0 1 9 -4.6" />
      <path d="M18 12 c0 3 2 3 2 3 H8" />
      <path d="M10 19 a2 2 0 0 0 4 0" />
      <path d="M3 3 l18 18" />
    </>
  ),
  clock: (
    <>
      <circle cx={12} cy={12} r={9} />
      <path d="M12 7.5 v4.5 l3 1.8" />
    </>
  ),
  plus: <path d="M12 5 v14 M5 12 h14" />,
  pencil: (
    <>
      <path d="M4 20 l1.2 -4 L16 5.2 l2.8 2.8 L8 18.8 Z" />
      <path d="M14 7.2 l2.8 2.8" />
    </>
  ),
};

type Props = { name: UiIconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">;

export function UiIcon({ name, size = 18, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
