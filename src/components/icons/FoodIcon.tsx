import type { SVGProps } from "react";

/**
 * Hand-drawn line icons for menu items, ported from the design mockups.
 * Yolk/garnish accents use a warm amber fill; the rest inherits currentColor.
 */
export type IconName =
  | "egg"
  | "pan"
  | "sausage"
  | "sandwich"
  | "avocado"
  | "wrap"
  | "pancake"
  | "toast"
  | "coffee"
  | "juice"
  | "bowl";

const YOLK = { fill: "#F2B544", stroke: "none" } as const;
const SEED = { fill: "#C2622C", stroke: "none" } as const;

const PATHS: Record<IconName, React.ReactNode> = {
  egg: (
    <>
      <ellipse cx={12} cy={13} rx={8} ry={6} />
      <circle cx={12} cy={12.5} r={2.6} {...YOLK} />
    </>
  ),
  pan: (
    <>
      <circle cx={10.5} cy={13} r={6.5} />
      <line x1={17} y1={13} x2={22} y2={13} />
      <circle cx={9} cy={12} r={1.4} {...YOLK} />
      <circle cx={12.5} cy={14.5} r={1.4} {...YOLK} />
    </>
  ),
  sausage: (
    <>
      <circle cx={8} cy={11} r={4} />
      <circle cx={8} cy={11} r={1.4} {...YOLK} />
      <rect x={13} y={13} width={8} height={4} rx={2} />
      <path d="M5 18 h14" />
    </>
  ),
  sandwich: (
    <>
      <path d="M3 17 L12 6 L21 17 Z" />
      <path d="M6.5 13 h11" />
    </>
  ),
  avocado: (
    <>
      <path d="M12 3 C7 3 6 9 6 12 C6 17 9 21 12 21 C15 21 18 17 18 12 C18 9 17 3 12 3 Z" />
      <circle cx={12} cy={13} r={2.6} {...SEED} />
    </>
  ),
  wrap: (
    <>
      <path d="M7 4 L17 4 L13 20 L11 20 Z" />
      <path d="M9 9 h6" />
      <path d="M9.7 14 h4.6" />
    </>
  ),
  pancake: (
    <>
      <ellipse cx={12} cy={11} rx={7} ry={2.4} />
      <ellipse cx={12} cy={14.5} rx={7} ry={2.4} />
      <rect x={10} y={7} width={4} height={2.4} rx={1} {...YOLK} />
    </>
  ),
  toast: (
    <>
      <rect x={5} y={6} width={14} height={12} rx={3} />
      <rect x={13.5} y={8.5} width={3.4} height={3.4} rx={1} {...YOLK} />
    </>
  ),
  coffee: (
    <>
      <path d="M5 9 h11 v4 a5 5 0 0 1 -5 5 h-1 a5 5 0 0 1 -5 -5 Z" />
      <path d="M16 10 h2.5 a2 2 0 0 1 0 4 H16" />
      <path d="M8 5 v-1 M11 5.5 v-1.5 M14 5 v-1" />
    </>
  ),
  juice: (
    <>
      <path d="M7 5 h10 l-1.4 13 a1 1 0 0 1 -1 .9 h-4.2 a1 1 0 0 1 -1 -.9 Z" />
      <path d="M15 3 l-1.2 4.5" />
      <circle cx={9.5} cy={9} r={1.3} {...SEED} />
    </>
  ),
  bowl: (
    <>
      <path d="M3 11 h18 a9 9 0 0 1 -18 0 Z" />
      <path d="M12 4 v3 M9 5 v2 M15 5 v2" />
    </>
  ),
};

type Props = { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, "name">;

export function FoodIcon({ name, size = 22, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...rest}
    >
      {PATHS[name] ?? PATHS.bowl}
    </svg>
  );
}

/** Best-effort icon for a menu item from its slug/name keywords. */
export function iconForItem(slug: string, name: string): IconName {
  const s = `${slug} ${name}`.toLowerCase();
  if (s.includes("benedict") || s.includes("egg")) return "egg";
  if (s.includes("shakshuka")) return "pan";
  if (s.includes("sausage") || s.includes("breakfast")) return "sausage";
  if (s.includes("club") || s.includes("sandwich") || s.includes("burger")) return "sandwich";
  if (s.includes("avocado")) return "avocado";
  if (s.includes("halloumi") || s.includes("wrap")) return "wrap";
  if (s.includes("pancake")) return "pancake";
  if (s.includes("french") || s.includes("toast")) return "toast";
  if (s.includes("juice") || s.includes("orange")) return "juice";
  if (s.includes("coffee") || s.includes("latte") || s.includes("flat") || s.includes("espresso") || s.includes("tea") || s.includes("sip")) return "coffee";
  return "bowl";
}

/** A small palette of chip colors cycled by category for the icon tiles. */
export const CHIP_PALETTE = [
  { bg: "#fbe9cc", color: "#c2622c" },
  { bg: "#eef2e6", color: "#6e8b5b" },
  { bg: "#f3ead8", color: "#8a6a45" },
  { bg: "#efeae0", color: "#7c6e5c" },
] as const;
