import { describe, it, expect } from "vitest";
import { nextStatusFor, stripSecretToken, isAmountTrusted } from "./webhook";

describe("nextStatusFor", () => {
  it("maps paid payment status to paid", () => {
    expect(nextStatusFor(undefined, "paid")).toBe("paid");
  });

  it("maps failed payment status to cancelled", () => {
    expect(nextStatusFor(undefined, "failed")).toBe("cancelled");
  });

  it("maps by event type when status is absent", () => {
    expect(nextStatusFor("payment.paid", undefined)).toBe("paid");
    expect(nextStatusFor("payment.failed", undefined)).toBe("cancelled");
  });

  it("returns null for unknown / in-progress events", () => {
    expect(nextStatusFor("payment.created", "initiated")).toBeNull();
    expect(nextStatusFor(undefined, undefined)).toBeNull();
  });
});

describe("stripSecretToken", () => {
  it("removes the shared secret before persistence", () => {
    const payload = {
      type: "payment.paid",
      secret_token: "super-secret",
      data: { id: "pay_1", amount: 11500 },
    };
    const cleaned = stripSecretToken(payload);
    expect(cleaned.secret_token).toBeUndefined();
    expect(cleaned.data).toEqual({ id: "pay_1", amount: 11500 });
    // original is not mutated
    expect(payload.secret_token).toBe("super-secret");
  });
});

describe("isAmountTrusted", () => {
  it("trusts a paid event only when the amount matches the order total", () => {
    expect(isAmountTrusted("paid", 11500, 11500)).toBe(true);
    expect(isAmountTrusted("paid", 9000, 11500)).toBe(false);
    expect(isAmountTrusted("paid", 12000, 11500)).toBe(false);
  });

  it("does not gate non-paid transitions on amount", () => {
    expect(isAmountTrusted("cancelled", 0, 11500)).toBe(true);
    expect(isAmountTrusted(null, 0, 11500)).toBe(true);
  });
});
