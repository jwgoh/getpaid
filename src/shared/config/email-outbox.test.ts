import { describe, expect, it } from "vitest";

import { computeBackoffMs, EMAIL_OUTBOX } from "./email-outbox";

const BASE_MS = EMAIL_OUTBOX.BASE_BACKOFF_MS;

describe("computeBackoffMs — full jitter window", () => {
  it("returns at least 50% of the exponential value (lowest random())", () => {
    const attempts = 2;
    const expectedExponential = BASE_MS * 2 ** attempts;
    const result = computeBackoffMs(attempts, BASE_MS, () => 0);

    expect(result).toBe(Math.floor(expectedExponential * EMAIL_OUTBOX.JITTER_MIN_RATIO));
  });

  it("returns at most 100% of the exponential value (highest random())", () => {
    const attempts = 3;
    const expectedExponential = BASE_MS * 2 ** attempts;
    const upperRatio = EMAIL_OUTBOX.JITTER_MIN_RATIO + EMAIL_OUTBOX.JITTER_RANGE_RATIO;
    const result = computeBackoffMs(attempts, BASE_MS, () => 0.9999999);

    expect(result).toBeLessThanOrEqual(Math.floor(expectedExponential * upperRatio));
    expect(result).toBeGreaterThan(Math.floor(expectedExponential * EMAIL_OUTBOX.JITTER_MIN_RATIO));
  });

  it("caps the exponential at MAX_BACKOFF_MS for high attempt counts", () => {
    const attempts = 20;
    const result = computeBackoffMs(attempts, BASE_MS, () => 0.5);
    const expectedExponential = EMAIL_OUTBOX.MAX_BACKOFF_MS;
    const expectedRatio = EMAIL_OUTBOX.JITTER_MIN_RATIO + 0.5 * EMAIL_OUTBOX.JITTER_RANGE_RATIO;

    expect(result).toBe(Math.floor(expectedExponential * expectedRatio));
  });

  it("two consecutive calls return distinct values when random() varies", () => {
    let counter = 0;
    const random = () => {
      counter += 1;

      return counter === 1 ? 0 : 1;
    };

    const first = computeBackoffMs(1, BASE_MS, random);
    const second = computeBackoffMs(1, BASE_MS, random);

    expect(first).not.toBe(second);
  });
});
