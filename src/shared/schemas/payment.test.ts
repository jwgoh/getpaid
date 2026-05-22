import { describe, expect, it } from "vitest";

import { PAYMENT_METHOD } from "@app/shared/config/payment-method";

import { recordPaymentApiSchema, recordPaymentSchema } from "./payment";

function buildPayload(overrides: Record<string, unknown> = {}) {
  return {
    amount: 10_000,
    method: PAYMENT_METHOD.BANK_TRANSFER,
    ...overrides,
  };
}

describe("recordPaymentApiSchema — paidAt validation (QA-002, QA-003)", () => {
  it("accepts a payment with no paidAt", () => {
    expect(recordPaymentApiSchema.safeParse(buildPayload()).success).toBe(true);
  });

  it("accepts a valid past paidAt", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ paidAt: "2026-05-01" }));

    expect(result.success).toBe(true);
  });

  it("rejects an unparseable paidAt", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ paidAt: "garbage" }));

    expect(result.success).toBe(false);
  });

  it("rejects a paidAt far in the future", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ paidAt: "9999-12-31" }));

    expect(result.success).toBe(false);
  });

  it("rejects a paidAt before the 2000-01-01 floor", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ paidAt: "1999-12-31" }));

    expect(result.success).toBe(false);
  });
});

describe("payment amount validation — integer cents (QA-001)", () => {
  it("rejects a fractional amount in recordPaymentApiSchema", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ amount: 10.5 }));

    expect(result.success).toBe(false);
  });

  it("rejects a fractional amount in recordPaymentSchema", () => {
    const result = recordPaymentSchema.safeParse(buildPayload({ amount: 10.5 }));

    expect(result.success).toBe(false);
  });

  it("accepts a whole-cent amount in recordPaymentApiSchema", () => {
    const result = recordPaymentApiSchema.safeParse(buildPayload({ amount: 10_000 }));

    expect(result.success).toBe(true);
  });

  it("accepts a whole-cent amount in recordPaymentSchema", () => {
    const result = recordPaymentSchema.safeParse(buildPayload({ amount: 10_000 }));

    expect(result.success).toBe(true);
  });
});
