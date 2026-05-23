import { describe, expect, it, vi } from "vitest";

import {
  createRequestBudget,
  isRequestBudgetExceeded,
  RequestBudgetExceededError,
} from "./timeout";

describe("createRequestBudget", () => {
  it("returns a signal that is not aborted on creation", () => {
    const budget = createRequestBudget(50);

    expect(budget.signal.aborted).toBe(false);
    budget.cancel();
  });

  it("aborts the signal after the budget elapses with a RequestBudgetExceededError reason", async () => {
    vi.useFakeTimers();

    try {
      const budget = createRequestBudget(100);

      vi.advanceTimersByTime(120);

      expect(budget.signal.aborted).toBe(true);
      expect(budget.signal.reason).toBeInstanceOf(RequestBudgetExceededError);
      budget.cancel();
    } finally {
      vi.useRealTimers();
    }
  });

  it("cancel() prevents the abort from firing", () => {
    vi.useFakeTimers();

    try {
      const budget = createRequestBudget(100);

      budget.cancel();
      vi.advanceTimersByTime(200);

      expect(budget.signal.aborted).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("rethrowIfExceeded throws the budget error when the signal aborted", () => {
    vi.useFakeTimers();

    try {
      const budget = createRequestBudget(50);

      vi.advanceTimersByTime(60);

      expect(() => budget.rethrowIfExceeded(new Error("downstream"))).toThrow(
        RequestBudgetExceededError
      );
      budget.cancel();
    } finally {
      vi.useRealTimers();
    }
  });

  it("rethrowIfExceeded re-throws the original error when the signal did not abort", () => {
    const budget = createRequestBudget(1000);
    const original = new Error("downstream");

    expect(() => budget.rethrowIfExceeded(original)).toThrow(original);
    budget.cancel();
  });
});

describe("isRequestBudgetExceeded", () => {
  it("returns true for a direct RequestBudgetExceededError", () => {
    expect(isRequestBudgetExceeded(new RequestBudgetExceededError(100))).toBe(true);
  });

  it("returns true when cause is RequestBudgetExceededError", () => {
    const wrapped = new Error("wrapped", { cause: new RequestBudgetExceededError(100) });

    expect(isRequestBudgetExceeded(wrapped)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isRequestBudgetExceeded(new Error("boom"))).toBe(false);
  });
});
