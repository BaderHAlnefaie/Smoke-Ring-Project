import { describe, it, expect } from "vitest";
import {
  wholeUnits,
  exactUnits,
  unitsToServings,
  isOutOfStock,
  isLowStock,
  stockLevel,
  formatUnits,
} from "./inventory";

// A turkey bag makes 9 sandwiches → servings_per_unit = 9.
const PER_UNIT = 9;

describe("wholeUnits", () => {
  it("floors servings to whole units", () => {
    expect(wholeUnits(27, PER_UNIT)).toBe(3);
    expect(wholeUnits(19, PER_UNIT)).toBe(2);
    expect(wholeUnits(8, PER_UNIT)).toBe(0);
  });
  it("is 0 for empty or invalid yields", () => {
    expect(wholeUnits(0, PER_UNIT)).toBe(0);
    expect(wholeUnits(45, 0)).toBe(0);
  });
});

describe("exactUnits", () => {
  it("gives the fractional unit count", () => {
    expect(exactUnits(45, PER_UNIT)).toBe(5);
    expect(exactUnits(13, PER_UNIT)).toBeCloseTo(1.444, 3);
  });
  it("is 0 when the yield is non-positive", () => {
    expect(exactUnits(10, 0)).toBe(0);
  });
});

describe("unitsToServings", () => {
  it("converts whole units received into servings", () => {
    expect(unitsToServings(5, PER_UNIT)).toBe(45); // receive 5 bags
    expect(unitsToServings(1, PER_UNIT)).toBe(9);
  });
  it("clamps negatives and rounds inputs", () => {
    expect(unitsToServings(-3, PER_UNIT)).toBe(0);
    expect(unitsToServings(2.4, PER_UNIT)).toBe(18);
  });
});

describe("out / low stock", () => {
  it("flags out of stock at zero or below (oversold)", () => {
    expect(isOutOfStock(0)).toBe(true);
    expect(isOutOfStock(-2)).toBe(true);
    expect(isOutOfStock(1)).toBe(false);
  });
  it("flags low only when at/under a positive threshold and not out", () => {
    expect(isLowStock(5, 9)).toBe(true);
    expect(isLowStock(9, 9)).toBe(true);
    expect(isLowStock(10, 9)).toBe(false);
    expect(isLowStock(0, 9)).toBe(false); // that's "out", not "low"
    expect(isLowStock(5, 0)).toBe(false); // threshold disabled
  });
});

describe("stockLevel", () => {
  it("classifies out / low / ok", () => {
    expect(stockLevel(0, 9)).toBe("out");
    expect(stockLevel(-1, 9)).toBe("out");
    expect(stockLevel(6, 9)).toBe("low");
    expect(stockLevel(50, 9)).toBe("ok");
    expect(stockLevel(50, 0)).toBe("ok"); // no threshold → never "low"
  });
});

describe("formatUnits", () => {
  it("trims whole units and rounds to one decimal", () => {
    expect(formatUnits(45, PER_UNIT)).toBe("5");
    expect(formatUnits(13, PER_UNIT)).toBe("1.4");
    expect(formatUnits(0, PER_UNIT)).toBe("0");
  });
});
