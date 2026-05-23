import { describe, expect, it, vi } from "vitest";

import { isTransientError, retryOnTransient } from "./retry";

class FakeHttpError extends Error {
  constructor(public status: number) {
    super(`HTTP ${status}`);
    this.name = "FakeHttpError";
  }
}

const noopSleep = async () => {};
const fixedRandom = () => 0;

describe("retryOnTransient", () => {
  it("returns on first success without retries", async () => {
    const fn = vi.fn().mockResolvedValueOnce("ok");

    const result = await retryOnTransient(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      sleep: noopSleep,
      random: fixedRandom,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on transient 429 and succeeds on third attempt", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new FakeHttpError(429))
      .mockRejectedValueOnce(new FakeHttpError(429))
      .mockResolvedValueOnce("ok");

    const result = await retryOnTransient(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      sleep: noopSleep,
      random: fixedRandom,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("retries on 5xx and succeeds on second attempt", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new FakeHttpError(503)).mockResolvedValueOnce("ok");

    const result = await retryOnTransient(fn, {
      maxAttempts: 3,
      baseDelayMs: 1,
      sleep: noopSleep,
      random: fixedRandom,
    });

    expect(result).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx (other than 429) and bubbles the error", async () => {
    const error = new FakeHttpError(404);
    const fn = vi.fn().mockRejectedValueOnce(error);

    await expect(
      retryOnTransient(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        sleep: noopSleep,
        random: fixedRandom,
      })
    ).rejects.toBe(error);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on non-HTTP errors (network/timeout) up to maxAttempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("ECONNRESET"));

    await expect(
      retryOnTransient(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        sleep: noopSleep,
        random: fixedRandom,
      })
    ).rejects.toThrow("ECONNRESET");

    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("does not retry an AbortError", async () => {
    const abortError = new Error("aborted");

    abortError.name = "AbortError";
    const fn = vi.fn().mockRejectedValueOnce(abortError);

    await expect(
      retryOnTransient(fn, {
        maxAttempts: 3,
        baseDelayMs: 1,
        sleep: noopSleep,
        random: fixedRandom,
      })
    ).rejects.toBe(abortError);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("isTransientError", () => {
  it("classifies HTTP 429 as transient", () => {
    expect(isTransientError(new FakeHttpError(429))).toBe(true);
  });

  it("classifies HTTP 503 as transient", () => {
    expect(isTransientError(new FakeHttpError(503))).toBe(true);
  });

  it("classifies HTTP 404 as permanent", () => {
    expect(isTransientError(new FakeHttpError(404))).toBe(false);
  });

  it("classifies a plain Error as transient (network/unknown)", () => {
    expect(isTransientError(new Error("boom"))).toBe(true);
  });

  it("classifies AbortError as non-transient", () => {
    const err = new Error("aborted");

    err.name = "AbortError";

    expect(isTransientError(err)).toBe(false);
  });
});
