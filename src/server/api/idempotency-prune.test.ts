import { NextResponse } from "next/server";

import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const idempotencyKey = {
  deleteMany: vi.fn(),
  count: vi.fn(),
};

vi.mock("@app/server/db", () => ({
  prisma: { idempotencyKey },
}));

vi.mock("@app/server/api/route-helpers", () => ({
  errorResponse: (code: string, message: string, status: number) =>
    NextResponse.json({ error: { code, message } }, { status }),
}));

const FIXED_NOW = new Date("2026-05-23T00:00:00Z");
const LARGE_DELETE_COUNT = 50_001;

async function loadModule() {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
  vi.stubEnv("NEXTAUTH_SECRET", randomBytes(32).toString("base64"));

  const helpers = await import("./idempotency");
  const db = await import("@app/server/db");

  return { ...helpers, prisma: db.prisma };
}

beforeEach(() => {
  idempotencyKey.deleteMany.mockReset();
  idempotencyKey.count.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pruneExpiredIdempotencyKeys", () => {
  it("returns deleted = 0 when no expired rows", async () => {
    const { pruneExpiredIdempotencyKeys, prisma } = await loadModule();

    idempotencyKey.deleteMany.mockResolvedValue({ count: 0 });

    const result = await pruneExpiredIdempotencyKeys(prisma, FIXED_NOW);

    expect(result).toEqual({ deleted: 0 });
    expect(idempotencyKey.deleteMany).toHaveBeenCalledTimes(1);
    expect(idempotencyKey.deleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: FIXED_NOW } },
    });
  });

  it("deletes rows whose expiresAt <= now", async () => {
    const { pruneExpiredIdempotencyKeys, prisma } = await loadModule();

    idempotencyKey.deleteMany.mockResolvedValue({ count: 17 });

    const result = await pruneExpiredIdempotencyKeys(prisma, FIXED_NOW);

    expect(result).toEqual({ deleted: 17 });
  });

  it("emits a structured warning when deleted > 50_000", async () => {
    const { pruneExpiredIdempotencyKeys, prisma } = await loadModule();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    idempotencyKey.deleteMany.mockResolvedValue({ count: LARGE_DELETE_COUNT });

    await pruneExpiredIdempotencyKeys(prisma, FIXED_NOW);

    expect(warnSpy).toHaveBeenCalledTimes(1);

    const arg = warnSpy.mock.calls[0]?.[0];
    const payload = JSON.parse(String(arg)) as { event: string; table: string; deleted: number };

    expect(payload.event).toBe("prune.warning.large_delete");
    expect(payload.table).toBe("IdempotencyKey");
    expect(payload.deleted).toBe(LARGE_DELETE_COUNT);

    warnSpy.mockRestore();
  });
});

describe("countExpiredIdempotencyKeys", () => {
  it("returns count = 0 when no expired rows", async () => {
    const { countExpiredIdempotencyKeys, prisma } = await loadModule();

    idempotencyKey.count.mockResolvedValue(0);

    const result = await countExpiredIdempotencyKeys(prisma, FIXED_NOW);

    expect(result).toEqual({ count: 0 });
    expect(idempotencyKey.count).toHaveBeenCalledWith({
      where: { expiresAt: { lte: FIXED_NOW } },
    });
  });

  it("returns row count with lte predicate", async () => {
    const { countExpiredIdempotencyKeys, prisma } = await loadModule();

    idempotencyKey.count.mockResolvedValue(42);

    const result = await countExpiredIdempotencyKeys(prisma, FIXED_NOW);

    expect(result).toEqual({ count: 42 });
  });

  it("uses identical WHERE predicate as the prune function", async () => {
    const { pruneExpiredIdempotencyKeys, countExpiredIdempotencyKeys, prisma } = await loadModule();

    idempotencyKey.deleteMany.mockResolvedValue({ count: 0 });
    idempotencyKey.count.mockResolvedValue(0);

    await pruneExpiredIdempotencyKeys(prisma, FIXED_NOW);
    await countExpiredIdempotencyKeys(prisma, FIXED_NOW);

    const pruneCall = idempotencyKey.deleteMany.mock.calls[0]?.[0];
    const countCall = idempotencyKey.count.mock.calls[0]?.[0];

    expect(countCall).toEqual(pruneCall);
  });
});
