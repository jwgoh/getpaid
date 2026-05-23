import { randomBytes } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const emailOutbox = {
  deleteMany: vi.fn(),
  count: vi.fn(),
};

vi.mock("@app/server/db", () => ({
  prisma: { emailOutbox },
}));

const FIXED_NOW = new Date("2026-05-23T00:00:00Z");
const RETENTION_SENT_DAYS = 30;
const RETENTION_FAILED_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const CUTOFF_SENT = new Date(FIXED_NOW.getTime() - RETENTION_SENT_DAYS * MS_PER_DAY);
const CUTOFF_FAILED = new Date(FIXED_NOW.getTime() - RETENTION_FAILED_DAYS * MS_PER_DAY);
const LARGE_DELETE_COUNT = 50_001;

async function loadModule() {
  vi.resetModules();
  vi.stubEnv("DATABASE_URL", "postgresql://localhost:5432/test");
  vi.stubEnv("NEXTAUTH_SECRET", randomBytes(32).toString("base64"));

  const helpers = await import("./outbox");
  const db = await import("@app/server/db");

  return { ...helpers, prisma: db.prisma };
}

beforeEach(() => {
  emailOutbox.deleteMany.mockReset();
  emailOutbox.count.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("pruneSentOutbox", () => {
  it("returns 0/0 when no SENT or FAILED rows", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValue({ count: 0 });

    const result = await pruneSentOutbox(prisma, FIXED_NOW);

    expect(result).toEqual({ deletedSent: 0, deletedFailed: 0 });
    expect(emailOutbox.deleteMany).toHaveBeenCalledTimes(2);
  });

  it("deletes SENT rows older than RETENTION_SENT_DAYS (30d)", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValueOnce({ count: 5 }).mockResolvedValueOnce({ count: 0 });

    const result = await pruneSentOutbox(prisma, FIXED_NOW);

    expect(result.deletedSent).toBe(5);
    expect(emailOutbox.deleteMany).toHaveBeenNthCalledWith(1, {
      where: { status: "SENT", createdAt: { lt: CUTOFF_SENT } },
    });
  });

  it("deletes FAILED rows older than RETENTION_FAILED_DAYS (90d)", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValueOnce({ count: 0 }).mockResolvedValueOnce({ count: 2 });

    const result = await pruneSentOutbox(prisma, FIXED_NOW);

    expect(result.deletedFailed).toBe(2);
    expect(emailOutbox.deleteMany).toHaveBeenNthCalledWith(2, {
      where: { status: "FAILED", createdAt: { lt: CUTOFF_FAILED } },
    });
  });

  it("uses EMAIL_OUTBOX_STATUS constants — SENT then FAILED", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValue({ count: 0 });

    await pruneSentOutbox(prisma, FIXED_NOW);

    const firstCall = emailOutbox.deleteMany.mock.calls[0]?.[0] as {
      where: { status: string };
    };
    const secondCall = emailOutbox.deleteMany.mock.calls[1]?.[0] as {
      where: { status: string };
    };

    expect(firstCall.where.status).toBe("SENT");
    expect(secondCall.where.status).toBe("FAILED");
  });

  it("does not delete PENDING rows", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValue({ count: 0 });

    await pruneSentOutbox(prisma, FIXED_NOW);

    for (const call of emailOutbox.deleteMany.mock.calls) {
      const arg = call[0] as { where: { status: string } };

      expect(arg.where.status).not.toBe("PENDING");
    }
  });

  it("emits large-delete warning per arm when count > 50_000", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    emailOutbox.deleteMany
      .mockResolvedValueOnce({ count: LARGE_DELETE_COUNT })
      .mockResolvedValueOnce({ count: LARGE_DELETE_COUNT + 1 });

    await pruneSentOutbox(prisma, FIXED_NOW);

    expect(warnSpy).toHaveBeenCalledTimes(2);

    const payloads = warnSpy.mock.calls.map(
      (c) => JSON.parse(String(c[0])) as { arm: string; deleted: number }
    );

    expect(payloads[0]?.arm).toBe("SENT");
    expect(payloads[0]?.deleted).toBe(LARGE_DELETE_COUNT);
    expect(payloads[1]?.arm).toBe("FAILED");
    expect(payloads[1]?.deleted).toBe(LARGE_DELETE_COUNT + 1);

    warnSpy.mockRestore();
  });

  it("throws RetentionMisconfiguredError when sentDays override is 0", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();
    const { RetentionMisconfiguredError } = await import("@app/server/prune/errors");

    await expect(pruneSentOutbox(prisma, FIXED_NOW, { sentDays: 0 })).rejects.toBeInstanceOf(
      RetentionMisconfiguredError
    );
    expect(emailOutbox.deleteMany).not.toHaveBeenCalled();
  });

  it("throws RetentionMisconfiguredError when failedDays override is 0", async () => {
    const { pruneSentOutbox, prisma } = await loadModule();
    const { RetentionMisconfiguredError } = await import("@app/server/prune/errors");

    await expect(pruneSentOutbox(prisma, FIXED_NOW, { failedDays: 0 })).rejects.toBeInstanceOf(
      RetentionMisconfiguredError
    );
    expect(emailOutbox.deleteMany).not.toHaveBeenCalled();
  });
});

describe("countSentOutbox", () => {
  it("returns 0/0 when no rows", async () => {
    const { countSentOutbox, prisma } = await loadModule();

    emailOutbox.count.mockResolvedValue(0);

    const result = await countSentOutbox(prisma, FIXED_NOW);

    expect(result).toEqual({ sent: 0, failed: 0 });
    expect(emailOutbox.count).toHaveBeenCalledTimes(2);
  });

  it("counts SENT and FAILED rows with same cutoffs as the prune", async () => {
    const { countSentOutbox, prisma } = await loadModule();

    emailOutbox.count.mockResolvedValueOnce(11).mockResolvedValueOnce(3);

    const result = await countSentOutbox(prisma, FIXED_NOW);

    expect(result).toEqual({ sent: 11, failed: 3 });
    expect(emailOutbox.count).toHaveBeenNthCalledWith(1, {
      where: { status: "SENT", createdAt: { lt: CUTOFF_SENT } },
    });
    expect(emailOutbox.count).toHaveBeenNthCalledWith(2, {
      where: { status: "FAILED", createdAt: { lt: CUTOFF_FAILED } },
    });
  });

  it("uses identical WHERE predicates as pruneSentOutbox", async () => {
    const { pruneSentOutbox, countSentOutbox, prisma } = await loadModule();

    emailOutbox.deleteMany.mockResolvedValue({ count: 0 });
    emailOutbox.count.mockResolvedValue(0);

    await pruneSentOutbox(prisma, FIXED_NOW);
    await countSentOutbox(prisma, FIXED_NOW);

    const sentPruneWhere = emailOutbox.deleteMany.mock.calls[0]?.[0];
    const failedPruneWhere = emailOutbox.deleteMany.mock.calls[1]?.[0];
    const sentCountWhere = emailOutbox.count.mock.calls[0]?.[0];
    const failedCountWhere = emailOutbox.count.mock.calls[1]?.[0];

    expect(sentCountWhere).toEqual(sentPruneWhere);
    expect(failedCountWhere).toEqual(failedPruneWhere);
  });

  it("throws RetentionMisconfiguredError when sentDays override is 0", async () => {
    const { countSentOutbox, prisma } = await loadModule();
    const { RetentionMisconfiguredError } = await import("@app/server/prune/errors");

    await expect(countSentOutbox(prisma, FIXED_NOW, { sentDays: 0 })).rejects.toBeInstanceOf(
      RetentionMisconfiguredError
    );
    expect(emailOutbox.count).not.toHaveBeenCalled();
  });
});
