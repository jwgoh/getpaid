import { describe, expect, it } from "vitest";

import { makeEmailOutbox } from "./email-outbox";
import { makeIdempotencyKey } from "./idempotency-key";

const SAMPLE_COUNT = 1000;
const DEFAULT_USER_ID = "user-factory-unit-test";

describe("factories — MT-011 unique-key sanity", () => {
  it("makeEmailOutbox produces a unique idempotencyKey across SAMPLE_COUNT calls", () => {
    const keys = new Set<string>();

    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const outbox = makeEmailOutbox({ userId: DEFAULT_USER_ID });

      expect(typeof outbox.idempotencyKey).toBe("string");
      keys.add(outbox.idempotencyKey ?? "");
    }

    expect(keys.size).toBe(SAMPLE_COUNT);
  });

  it("makeIdempotencyKey produces a unique key across SAMPLE_COUNT calls", () => {
    const keys = new Set<string>();
    const hashes = new Set<string>();

    for (let i = 0; i < SAMPLE_COUNT; i += 1) {
      const row = makeIdempotencyKey({ userId: DEFAULT_USER_ID });

      keys.add(row.key);
      hashes.add(row.requestHash ?? "");
    }

    expect(keys.size).toBe(SAMPLE_COUNT);
    expect(hashes.size).toBe(SAMPLE_COUNT);
  });
});
