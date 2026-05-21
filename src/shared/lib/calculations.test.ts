import { describe, expect, it } from "vitest";

import { DISCOUNT_TYPE } from "@app/shared/config/invoice-status";
import { SCHEMA_LIMITS } from "@app/shared/schemas/limits";

import { buildDiscountInput, calculateTotals } from "./calculations";

describe("calculateTotals — basic arithmetic", () => {
  it("sums line items into the subtotal", () => {
    const result = calculateTotals([
      { quantity: 2, unitPrice: 1500 },
      { quantity: 1, unitPrice: 500 },
    ]);

    expect(result.subtotal).toBe(3500);
    expect(result.total).toBe(3500);
  });

  it("applies a percentage discount", () => {
    const result = calculateTotals([{ quantity: 1, unitPrice: 10_000 }], {
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: 10,
    });

    expect(result.discountAmount).toBe(1000);
    expect(result.total).toBe(9000);
  });

  it("applies a fixed discount", () => {
    const result = calculateTotals([{ quantity: 1, unitPrice: 10_000 }], {
      type: DISCOUNT_TYPE.FIXED,
      value: 2500,
    });

    expect(result.discountAmount).toBe(2500);
    expect(result.total).toBe(7500);
  });

  it("applies tax on the discounted amount", () => {
    const result = calculateTotals(
      [{ quantity: 1, unitPrice: 10_000 }],
      { type: DISCOUNT_TYPE.FIXED, value: 2000 },
      20
    );

    expect(result.taxAmount).toBe(1600);
    expect(result.total).toBe(9600);
  });

  it("never lets a discount push the total below zero", () => {
    const result = calculateTotals([{ quantity: 1, unitPrice: 1000 }], {
      type: DISCOUNT_TYPE.FIXED,
      value: 5000,
    });

    expect(result.total).toBe(0);
  });
});

describe("calculateTotals — boundary", () => {
  it("computes the maximum per-line product without overflowing MONEY_MAX_CENTS", () => {
    const result = calculateTotals([
      { quantity: SCHEMA_LIMITS.QUANTITY_MAX, unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS },
    ]);

    expect(result.subtotal).toBe(
      SCHEMA_LIMITS.QUANTITY_MAX * SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS
    );
    expect(result.subtotal).toBeLessThanOrEqual(SCHEMA_LIMITS.MONEY_MAX_CENTS);
    expect(result.total).toBeLessThanOrEqual(SCHEMA_LIMITS.MONEY_MAX_CENTS);
  });

  it("can produce a subtotal above MONEY_MAX_CENTS when many max line items are summed", () => {
    const maxLine = {
      quantity: SCHEMA_LIMITS.QUANTITY_MAX,
      unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
    };
    const result = calculateTotals([maxLine, maxLine]);

    expect(result.subtotal).toBeGreaterThan(SCHEMA_LIMITS.MONEY_MAX_CENTS);
  });
});

describe("buildDiscountInput", () => {
  it("returns null when the discount type is missing", () => {
    expect(buildDiscountInput(null, 10)).toBeNull();
  });

  it("returns null when the discount value is zero", () => {
    expect(buildDiscountInput(DISCOUNT_TYPE.FIXED, 0)).toBeNull();
  });

  it("returns a discount input for a valid percentage discount", () => {
    expect(buildDiscountInput(DISCOUNT_TYPE.PERCENTAGE, 15)).toEqual({
      type: DISCOUNT_TYPE.PERCENTAGE,
      value: 15,
    });
  });
});
