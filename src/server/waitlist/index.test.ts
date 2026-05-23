import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const waitlistEntry = {
  findMany: vi.fn(),
  deleteMany: vi.fn(),
  count: vi.fn(),
};
const user = {
  findMany: vi.fn(),
};

vi.mock("@app/server/db", () => ({
  prisma: { waitlistEntry, user },
}));

const FIXED_NOW = new Date("2026-05-23T00:00:00Z");
const RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CUTOFF = new Date(FIXED_NOW.getTime() - RETENTION_DAYS * MS_PER_DAY);
const LARGE_DELETE_COUNT = 50_001;

async function loadModule() {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
  vi.stubEnv("NEXTAUTH_SECRET", randomBytes(32).toString("base64"));

  const helpers = await import("./index");
  const db = await import("@app/server/db");

  return { ...helpers, prisma: db.prisma };
}

beforeEach(() => {
  waitlistEntry.findMany.mockReset();
  waitlistEntry.deleteMany.mockReset();
  waitlistEntry.count.mockReset();
  user.findMany.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pruneConvertedWaitlistEntries", () => {
  it("returns 0 and skips user.findMany when no candidates older than cutoff", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();

    waitlistEntry.findMany.mockResolvedValue([]);

    const result = await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(result).toEqual({ deleted: 0 });
    expect(waitlistEntry.findMany).toHaveBeenCalledTimes(1);
    expect(user.findMany).not.toHaveBeenCalled();
    expect(waitlistEntry.deleteMany).not.toHaveBeenCalled();
  });

  it("returns 0 when candidates exist but no User matches", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();

    waitlistEntry.findMany.mockResolvedValue([{ email: "a@b.com" }]);
    user.findMany.mockResolvedValue([]);

    const result = await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(result).toEqual({ deleted: 0 });
    expect(waitlistEntry.deleteMany).not.toHaveBeenCalled();
  });

  it("deletes orphan whose email matches a User and is older than 90d", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();

    waitlistEntry.findMany.mockResolvedValue([{ email: "converted@x.com" }]);
    user.findMany.mockResolvedValue([{ email: "converted@x.com" }]);
    waitlistEntry.deleteMany.mockResolvedValue({ count: 1 });

    const result = await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(result).toEqual({ deleted: 1 });
    expect(waitlistEntry.deleteMany).toHaveBeenCalledWith({
      where: { email: { in: ["converted@x.com"] }, createdAt: { lt: CUTOFF } },
    });
  });

  it("uses a single batched user.findMany (not per-row N+1)", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();

    const candidates = [{ email: "a@x.com" }, { email: "b@x.com" }, { email: "c@x.com" }];

    waitlistEntry.findMany.mockResolvedValue(candidates);
    user.findMany.mockResolvedValue([{ email: "a@x.com" }, { email: "b@x.com" }]);
    waitlistEntry.deleteMany.mockResolvedValue({ count: 2 });

    await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(user.findMany).toHaveBeenCalledTimes(1);

    const callArg = user.findMany.mock.calls[0]?.[0] as {
      where: { email: { in: string[] } };
    };

    expect(callArg.where.email.in).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  it("emits large-delete warning when deleted > 50_000", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    waitlistEntry.findMany.mockResolvedValue([{ email: "x@x.com" }]);
    user.findMany.mockResolvedValue([{ email: "x@x.com" }]);
    waitlistEntry.deleteMany.mockResolvedValue({ count: LARGE_DELETE_COUNT });

    await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(warnSpy).toHaveBeenCalledTimes(1);

    const payload = JSON.parse(String(warnSpy.mock.calls[0]?.[0])) as {
      event: string;
      table: string;
      deleted: number;
    };

    expect(payload.event).toBe("prune.warning.large_delete");
    expect(payload.table).toBe("WaitlistEntry");
    expect(payload.deleted).toBe(LARGE_DELETE_COUNT);

    warnSpy.mockRestore();
  });

  it("throws RetentionMisconfiguredError when orphanDays override is 0", async () => {
    const { pruneConvertedWaitlistEntries, prisma } = await loadModule();
    const { RetentionMisconfiguredError } = await import("@app/server/prune/errors");

    await expect(
      pruneConvertedWaitlistEntries(prisma, FIXED_NOW, { orphanDays: 0 })
    ).rejects.toBeInstanceOf(RetentionMisconfiguredError);
    expect(waitlistEntry.findMany).not.toHaveBeenCalled();
  });
});

describe("countConvertedWaitlistEntries", () => {
  it("returns candidates = 0 when no candidates", async () => {
    const { countConvertedWaitlistEntries, prisma } = await loadModule();

    waitlistEntry.count.mockResolvedValue(0);

    const result = await countConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(result).toEqual({ candidates: 0 });
    expect(waitlistEntry.count).toHaveBeenCalledWith({
      where: { createdAt: { lt: CUTOFF } },
    });
  });

  it("returns candidate count with lt predicate", async () => {
    const { countConvertedWaitlistEntries, prisma } = await loadModule();

    waitlistEntry.count.mockResolvedValue(7);

    const result = await countConvertedWaitlistEntries(prisma, FIXED_NOW);

    expect(result).toEqual({ candidates: 7 });
  });

  it("uses the same createdAt cutoff as the prune candidate-find", async () => {
    const { pruneConvertedWaitlistEntries, countConvertedWaitlistEntries, prisma } =
      await loadModule();

    waitlistEntry.findMany.mockResolvedValue([]);
    waitlistEntry.count.mockResolvedValue(0);

    await pruneConvertedWaitlistEntries(prisma, FIXED_NOW);
    await countConvertedWaitlistEntries(prisma, FIXED_NOW);

    const pruneFindManyWhere = waitlistEntry.findMany.mock.calls[0]?.[0] as {
      where: { createdAt: { lt: Date } };
    };
    const countWhere = waitlistEntry.count.mock.calls[0]?.[0] as {
      where: { createdAt: { lt: Date } };
    };

    expect(countWhere.where.createdAt.lt.getTime()).toBe(
      pruneFindManyWhere.where.createdAt.lt.getTime()
    );
  });

  it("throws RetentionMisconfiguredError when orphanDays override is 0", async () => {
    const { countConvertedWaitlistEntries, prisma } = await loadModule();
    const { RetentionMisconfiguredError } = await import("@app/server/prune/errors");

    await expect(
      countConvertedWaitlistEntries(prisma, FIXED_NOW, { orphanDays: 0 })
    ).rejects.toBeInstanceOf(RetentionMisconfiguredError);
    expect(waitlistEntry.count).not.toHaveBeenCalled();
  });
});
