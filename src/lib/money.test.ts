import { describe, it, expect } from "vitest";
import { vatHalalas, totalHalalas, formatHalalas } from "./money";

describe("vatHalalas", () => {
  it("computes 15% VAT", () => {
    expect(vatHalalas(10000)).toBe(1500);
  });

  it("rounds half away from zero (matches the SQL create_order RPC)", () => {
    // 333 * 0.15 = 49.95 -> 50
    expect(vatHalalas(333)).toBe(50);
    // 350 * 0.15 = 52.5 -> 53
    expect(vatHalalas(350)).toBe(53);
  });

  it("handles zero", () => {
    expect(vatHalalas(0)).toBe(0);
  });
});

describe("totalHalalas", () => {
  it("is subtotal + VAT", () => {
    expect(totalHalalas(10000)).toBe(11500);
    expect(totalHalalas(333)).toBe(383);
  });
});

describe("formatHalalas", () => {
  it("formats SAR amounts from integer halalas", () => {
    expect(formatHalalas(10000, "en")).toMatch(/100/);
  });

  it("returns a non-empty string for both locales", () => {
    expect(formatHalalas(1500, "en").length).toBeGreaterThan(0);
    expect(formatHalalas(1500, "ar").length).toBeGreaterThan(0);
  });
});
