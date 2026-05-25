import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EMAIL_OUTBOX_KIND, EMAIL_OUTBOX_STATUS } from "@app/shared/config/email-outbox";
import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { asInvoiceId, asUserId } from "@app/shared/types/ids";

const sendEmailMock = vi.fn().mockResolvedValue({ data: { id: "fake-resend-id" }, error: null });

vi.mock("@app/server/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@app/server/email")>();

  return { ...actual, sendEmail: sendEmailMock };
});

const { prisma } = await import("@app/server/db");
const { buildOutboxIdempotencyKey } = await import("@app/server/email/outbox");
const { InvoiceAlreadySentError, InvoiceNotFoundError, sendInvoice } =
  await import("@app/server/invoices/send");
const factories = await import("@app/test/factories");

const TOTAL_CENTS = 12_000;
const PLACEHOLDER_KEY_PREFIX = "pending-";

interface SendInvoiceContext {
  invoiceId: ReturnType<typeof asInvoiceId>;
  userId: ReturnType<typeof asUserId>;
  ownerEmail: string;
  clientEmail: string;
}

async function seedSendableInvoice(
  status: (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS] = INVOICE_STATUS.DRAFT
): Promise<SendInvoiceContext> {
  const user = await factories.createUser(prisma);

  await factories.createSenderProfile(prisma, { userId: user.id });

  const client = await factories.createClient(prisma, { userId: user.id });
  const invoice = await factories.createInvoice(prisma, {
    userId: user.id,
    clientId: client.id,
    status,
    subtotal: TOTAL_CENTS,
    taxAmount: 0,
    total: TOTAL_CENTS,
  });

  return {
    invoiceId: asInvoiceId(invoice.id),
    userId: asUserId(user.id),
    ownerEmail: user.email,
    clientEmail: client.email,
  };
}

let consoleError: ReturnType<typeof vi.spyOn> | undefined;

beforeAll(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  sendEmailMock.mockClear();
  consoleError?.mockClear();
});

afterAll(() => {
  consoleError?.mockRestore();
});

describe("sendInvoice happy path", () => {
  it("flips DRAFT to SENT, writes a PENDING outbox row, and does not call sendEmail inside the transaction", async () => {
    const ctx = await seedSendableInvoice();

    const result = await sendInvoice(ctx.invoiceId, ctx.userId);

    expect(result.outboxId).toMatch(/.+/);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: ctx.invoiceId } });

    expect(invoice.status).toBe(INVOICE_STATUS.SENT);
    expect(invoice.sentAt).not.toBeNull();
    expect(invoice.paymentReference).not.toBeNull();

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: ctx.invoiceId, type: INVOICE_EVENT.SENT },
    });

    expect(events).toHaveLength(1);

    const outboxRow = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: result.outboxId },
    });

    expect(outboxRow.status).toBe(EMAIL_OUTBOX_STATUS.PENDING);
    expect(outboxRow.kind).toBe(EMAIL_OUTBOX_KIND.INVOICE);
    expect(outboxRow.relatedId).toBe(ctx.invoiceId);

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rewrites the placeholder idempotencyKey to the stable buildOutboxIdempotencyKey value inside the transaction", async () => {
    const ctx = await seedSendableInvoice();

    const result = await sendInvoice(ctx.invoiceId, ctx.userId);

    const outboxRow = await prisma.emailOutbox.findUniqueOrThrow({
      where: { id: result.outboxId },
    });

    const expectedStableKey = buildOutboxIdempotencyKey(
      EMAIL_OUTBOX_KIND.INVOICE,
      ctx.invoiceId,
      result.outboxId
    );

    expect(outboxRow.idempotencyKey).toBe(expectedStableKey);
    expect(outboxRow.idempotencyKey.startsWith(PLACEHOLDER_KEY_PREFIX)).toBe(false);
  });
});

describe("sendInvoice rejected status transitions", () => {
  it("rejects a non-DRAFT invoice with InvoiceAlreadySentError and writes no outbox row, no event, no status change", async () => {
    const ctx = await seedSendableInvoice(INVOICE_STATUS.PAID);

    await expect(sendInvoice(ctx.invoiceId, ctx.userId)).rejects.toBeInstanceOf(
      InvoiceAlreadySentError
    );

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: ctx.invoiceId } });

    expect(invoice.status).toBe(INVOICE_STATUS.PAID);
    expect(invoice.sentAt).toBeNull();
    expect(invoice.paymentReference).toBeNull();

    const events = await prisma.invoiceEvent.count({ where: { invoiceId: ctx.invoiceId } });

    expect(events).toBe(0);

    const outboxRows = await prisma.emailOutbox.count({ where: { relatedId: ctx.invoiceId } });

    expect(outboxRows).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an invoice that belongs to another user with InvoiceNotFoundError and writes nothing", async () => {
    const ctx = await seedSendableInvoice();
    const intruder = await factories.createUser(prisma);

    await expect(sendInvoice(ctx.invoiceId, asUserId(intruder.id))).rejects.toBeInstanceOf(
      InvoiceNotFoundError
    );

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: ctx.invoiceId } });

    expect(invoice.status).toBe(INVOICE_STATUS.DRAFT);
    expect(invoice.sentAt).toBeNull();

    const events = await prisma.invoiceEvent.count({ where: { invoiceId: ctx.invoiceId } });

    expect(events).toBe(0);

    const outboxRows = await prisma.emailOutbox.count({ where: { relatedId: ctx.invoiceId } });

    expect(outboxRows).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe("sendInvoice transactional guarantees", () => {
  it("rolls back the entire transaction when an outbox-row update fails inside the commit step", async () => {
    const ctx = await seedSendableInvoice();
    const updateSpy = vi
      .spyOn(prisma.emailOutbox, "update")
      .mockRejectedValueOnce(new Error("simulated commit failure"));

    await expect(sendInvoice(ctx.invoiceId, ctx.userId)).rejects.toThrow(
      "simulated commit failure"
    );

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: ctx.invoiceId } });

    expect(invoice.status).toBe(INVOICE_STATUS.DRAFT);
    expect(invoice.sentAt).toBeNull();
    expect(invoice.paymentReference).toBeNull();

    const events = await prisma.invoiceEvent.count({ where: { invoiceId: ctx.invoiceId } });

    expect(events).toBe(0);

    const outboxRows = await prisma.emailOutbox.count({ where: { relatedId: ctx.invoiceId } });

    expect(outboxRows).toBe(0);
    expect(sendEmailMock).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it("under concurrent calls writes at most one PENDING outbox row per invoice", async () => {
    const ctx = await seedSendableInvoice();

    const settled = await Promise.allSettled([
      sendInvoice(ctx.invoiceId, ctx.userId),
      sendInvoice(ctx.invoiceId, ctx.userId),
    ]);

    const fulfilled = settled.filter((r) => r.status === "fulfilled");
    const rejected = settled.filter((r) => r.status === "rejected");

    expect(fulfilled.length + rejected.length).toBe(2);
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    for (const r of rejected) {
      if (r.status === "rejected") {
        expect(r.reason).toBeInstanceOf(InvoiceAlreadySentError);
      }
    }

    const outboxRows = await prisma.emailOutbox.findMany({
      where: { relatedId: ctx.invoiceId, kind: EMAIL_OUTBOX_KIND.INVOICE },
    });

    expect(outboxRows.length).toBeLessThanOrEqual(1);

    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: ctx.invoiceId } });

    expect(invoice.status).toBe(INVOICE_STATUS.SENT);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});
