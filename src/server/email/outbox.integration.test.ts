import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { TIME } from "@app/shared/config/config";
import {
  EMAIL_OUTBOX,
  EMAIL_OUTBOX_KIND,
  EMAIL_OUTBOX_RELATED_TYPE,
  EMAIL_OUTBOX_STATUS,
} from "@app/shared/config/email-outbox";

const sendEmailMock = vi.fn();

vi.mock("@app/server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@app/server/email")>();

  return { ...actual, sendEmail: sendEmailMock };
});

const { prisma } = await import("@app/server/db");
const { dispatchOutbox, processOutbox } = await import("@app/server/email/outbox");
const factories = await import("@app/test/factories");

const FAKE_RESEND_MESSAGE_ID = "fake-resend-message-id";
const TRANSIENT_STATUS = 503;
const PERMANENT_STATUS = 422;

interface OutboxUserContext {
  userId: string;
  invoiceId: string;
}

async function seedUserAndInvoice(): Promise<OutboxUserContext> {
  const user = await factories.createUser(prisma);
  const client = await factories.createClient(prisma, { userId: user.id });
  const invoice = await factories.createInvoice(prisma, {
    userId: user.id,
    clientId: client.id,
  });

  return { userId: user.id, invoiceId: invoice.id };
}

function buildSuccessResponse() {
  return { data: { id: FAKE_RESEND_MESSAGE_ID }, error: null };
}

function buildErrorResponse(statusCode: number, name: string, message: string) {
  return { data: null, error: { statusCode, name, message } };
}

let consoleError: ReturnType<typeof vi.spyOn> | undefined;

beforeAll(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  sendEmailMock.mockReset();
  consoleError?.mockClear();
});

afterAll(() => {
  consoleError?.mockRestore();
});

describe("dispatchOutbox success path", () => {
  it("flips a PENDING row to SENT, sets sentAt and messageId, and clears retry fields", async () => {
    const ctx = await seedUserAndInvoice();
    const row = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
    });

    sendEmailMock.mockResolvedValueOnce(buildSuccessResponse());

    const updated = await dispatchOutbox(row.id);

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.SENT);
    expect(updated?.sentAt).not.toBeNull();
    expect(updated?.messageId).toBe(FAKE_RESEND_MESSAGE_ID);
    expect(updated?.lastError).toBeNull();
    expect(updated?.nextAttemptAt).toBeNull();
  });
});

describe("dispatchOutbox transient retry", () => {
  it("keeps a PENDING row pending, increments attempts, and schedules nextAttemptAt on a transient error", async () => {
    const ctx = await seedUserAndInvoice();
    const row = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
    });

    sendEmailMock.mockResolvedValueOnce(
      buildErrorResponse(TRANSIENT_STATUS, "internal_server_error", "service unavailable")
    );

    const updated = await dispatchOutbox(row.id);

    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.PENDING);
    expect(updated?.attempts).toBe(1);
    expect(updated?.lastError).toContain("service unavailable");
    expect(updated?.lastAttemptedAt).not.toBeNull();
    expect(updated?.nextAttemptAt).not.toBeNull();

    const nextAttemptMs = updated?.nextAttemptAt?.getTime() ?? 0;

    expect(nextAttemptMs).toBeGreaterThan(Date.now());
  });
});

describe("dispatchOutbox exhaustion", () => {
  it("flips PENDING to FAILED on the attempt that crosses MAX_ATTEMPTS for transient errors", async () => {
    const ctx = await seedUserAndInvoice();
    const row = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      attempts: EMAIL_OUTBOX.MAX_ATTEMPTS - 1,
    });

    sendEmailMock.mockResolvedValueOnce(
      buildErrorResponse(TRANSIENT_STATUS, "internal_server_error", "still failing")
    );

    const updated = await dispatchOutbox(row.id);

    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.FAILED);
    expect(updated?.attempts).toBe(EMAIL_OUTBOX.MAX_ATTEMPTS);
    expect(updated?.nextAttemptAt).toBeNull();
  });

  it("MT-014: keeps the row PENDING with nextAttemptAt set when attempts = MAX_ATTEMPTS - 2 and the next transient lands one below exhaustion", async () => {
    const ctx = await seedUserAndInvoice();
    const startingAttempts = EMAIL_OUTBOX.MAX_ATTEMPTS - 2;
    const row = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      attempts: startingAttempts,
    });

    sendEmailMock.mockResolvedValueOnce(
      buildErrorResponse(TRANSIENT_STATUS, "internal_server_error", "still transient")
    );

    const updated = await dispatchOutbox(row.id);

    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.PENDING);
    expect(updated?.attempts).toBe(startingAttempts + 1);
    expect(updated?.attempts).toBeLessThan(EMAIL_OUTBOX.MAX_ATTEMPTS);
    expect(updated?.lastAttemptedAt).not.toBeNull();
    expect(updated?.nextAttemptAt).not.toBeNull();
    expect((updated?.nextAttemptAt?.getTime() ?? 0) > Date.now()).toBe(true);
  });
});

describe("dispatchOutbox permanent failure", () => {
  it("flips PENDING straight to FAILED on the first permanent 4xx regardless of attempts", async () => {
    const ctx = await seedUserAndInvoice();
    const row = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
    });

    sendEmailMock.mockResolvedValueOnce(
      buildErrorResponse(PERMANENT_STATUS, "validation_error", "invalid recipient")
    );

    const updated = await dispatchOutbox(row.id);

    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.FAILED);
    expect(updated?.attempts).toBe(1);
    expect(updated?.nextAttemptAt).toBeNull();
    expect(updated?.lastError).toContain("invalid recipient");
  });
});

describe("dispatchOutbox malformed payload", () => {
  it("flips a row with a malformed payload to FAILED without calling sendEmail", async () => {
    const ctx = await seedUserAndInvoice();
    const row = await prisma.emailOutbox.create({
      data: {
        userId: ctx.userId,
        kind: EMAIL_OUTBOX_KIND.INVOICE,
        relatedType: EMAIL_OUTBOX_RELATED_TYPE.INVOICE,
        relatedId: ctx.invoiceId,
        idempotencyKey: "malformed-payload-key-aaaaaaaa",
        payload: { not: "a-real-resend-payload" },
      },
    });

    const updated = await dispatchOutbox(row.id);

    expect(updated?.status).toBe(EMAIL_OUTBOX_STATUS.FAILED);
    expect(updated?.lastError).toContain("malformed");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("processOutbox PENDING-only filter", () => {
  it("only dispatches PENDING rows whose nextAttemptAt is null or past, leaving SENT and FAILED untouched", async () => {
    const ctx = await seedUserAndInvoice();
    const futureAttempt = new Date(Date.now() + TIME.HOUR);

    const pendingFresh = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
    });
    const pendingDueRetry = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      nextAttemptAt: new Date(Date.now() - TIME.MINUTE),
    });
    const pendingFutureRetry = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      nextAttemptAt: futureAttempt,
    });
    const sentRow = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      status: EMAIL_OUTBOX_STATUS.SENT,
    });
    const failedRow = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      status: EMAIL_OUTBOX_STATUS.FAILED,
    });

    sendEmailMock.mockResolvedValue(buildSuccessResponse());

    const result = await processOutbox();

    expect(result.attempted).toBe(2);
    expect(sendEmailMock).toHaveBeenCalledTimes(2);

    const fresh = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: pendingFresh.id } });
    const dueRetry = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: pendingDueRetry.id },
    });
    const futureRetry = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: pendingFutureRetry.id },
    });
    const sentAfter = await prisma.emailOutbox.findUniqueOrThrow({ where: { id: sentRow.id } });
    const failedAfter = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: failedRow.id },
    });

    expect(fresh.status).toBe(EMAIL_OUTBOX_STATUS.SENT);
    expect(dueRetry.status).toBe(EMAIL_OUTBOX_STATUS.SENT);
    expect(futureRetry.status).toBe(EMAIL_OUTBOX_STATUS.PENDING);
    expect(sentAfter.status).toBe(EMAIL_OUTBOX_STATUS.SENT);
    expect(failedAfter.status).toBe(EMAIL_OUTBOX_STATUS.FAILED);
  });
});

describe("processOutbox per-row failure isolation — MT-008 deterministic", () => {
  it("isolates a per-row dispatch failure to the offending row keyed by payload subject, not call order", async () => {
    const ctx = await seedUserAndInvoice();
    const failingSubject = "FAIL_ME_SUBJECT";
    const failingRow = await factories.createEmailOutbox(prisma, {
      userId: ctx.userId,
      relatedId: ctx.invoiceId,
      payload: {
        from: "no-reply@test.local",
        to: "recipient@test.local",
        subject: failingSubject,
        html: "<p>fail</p>",
        text: "fail",
      },
    });
    const okRows = await Promise.all([
      factories.createEmailOutbox(prisma, { userId: ctx.userId, relatedId: ctx.invoiceId }),
      factories.createEmailOutbox(prisma, { userId: ctx.userId, relatedId: ctx.invoiceId }),
      factories.createEmailOutbox(prisma, { userId: ctx.userId, relatedId: ctx.invoiceId }),
      factories.createEmailOutbox(prisma, { userId: ctx.userId, relatedId: ctx.invoiceId }),
    ]);

    sendEmailMock.mockImplementation(async (payload: unknown) => {
      const subject =
        typeof payload === "object" && payload !== null
          ? (payload as { subject?: unknown }).subject
          : undefined;

      if (subject === failingSubject) {
        throw new Error("deterministic resend failure for FAIL_ME_SUBJECT");
      }

      return buildSuccessResponse();
    });

    const totalRows = okRows.length + 1;
    const result = await processOutbox();

    expect(result.attempted).toBe(totalRows);
    expect(sendEmailMock).toHaveBeenCalledTimes(totalRows);

    const failingState = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: failingRow.id },
      select: { id: true, status: true, attempts: true },
    });

    expect(failingState.status).toBe(EMAIL_OUTBOX_STATUS.PENDING);
    expect(failingState.attempts).toBe(1);

    const okStates = await prisma.emailOutbox.findMany({
      where: { id: { in: okRows.map((r) => r.id) } },
      select: { id: true, status: true, attempts: true },
    });

    expect(okStates).toHaveLength(okRows.length);

    for (const state of okStates) {
      expect(state.status).toBe(EMAIL_OUTBOX_STATUS.SENT);
      expect(state.attempts).toBe(0);
    }
  });
});
