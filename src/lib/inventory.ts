/**
 * Inventory is counted in integer "servings" — the smallest divisible unit — so
 * there is never any rounding drift (the same discipline money.ts applies with
 * halalas). Admins think in whole "units" (a bag, a box) where one unit yields
 * `servingsPerUnit` servings. These pure helpers convert between the two and
 * classify stock level; they hold no I/O and are unit-tested.
 */

export type StockLevel = "out" | "low" | "ok";

/** Whole units fully covered by the servings on hand (floor). 19 servings @ 9 → 2. */
export function wholeUnits(stockServings: number, servingsPerUnit: number): number {
  if (servingsPerUnit <= 0) return 0;
  return Math.floor(stockServings / servingsPerUnit);
}

/** Exact (possibly fractional) units, for display. 13 servings @ 9 → ~1.44. */
export function exactUnits(stockServings: number, servingsPerUnit: number): number {
  if (servingsPerUnit <= 0) return 0;
  return stockServings / servingsPerUnit;
}

/** Servings represented by N whole units — used when receiving stock. */
export function unitsToServings(units: number, servingsPerUnit: number): number {
  return Math.max(0, Math.round(units)) * Math.max(0, Math.round(servingsPerUnit));
}

/** Out when nothing is left (can also be oversold to a negative count). */
export function isOutOfStock(stockServings: number): boolean {
  return stockServings <= 0;
}

/** Low (but not out) when at/under the threshold. A threshold of 0 disables the warning. */
export function isLowStock(stockServings: number, lowStockServings: number): boolean {
  return stockServings > 0 && lowStockServings > 0 && stockServings <= lowStockServings;
}

export function stockLevel(stockServings: number, lowStockServings: number): StockLevel {
  if (isOutOfStock(stockServings)) return "out";
  if (isLowStock(stockServings, lowStockServings)) return "low";
  return "ok";
}

/** Units to at most one decimal, trimming a trailing ".0" (2, 1.4, 0). */
export function formatUnits(stockServings: number, servingsPerUnit: number): string {
  const u = exactUnits(stockServings, servingsPerUnit);
  return (Math.round(u * 10) / 10).toString();
}
