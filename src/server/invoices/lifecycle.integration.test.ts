import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { PAYMENT_METHOD } from "@app/shared/config/payment-method";
import {
  asInvoiceId,
  asPublicId,
  asUserId,
  type InvoiceId,
  type PublicId,
  type UserId,
} from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { markInvoicePaid, markInvoiceViewed } from "@app/server/invoices";

import { createClient, createInvoice as makeInvoiceRow, createUser } from "@app/test/factories";

const DEFAULT_TOTAL_CENTS = 10_000;
const PARTIAL_PAID_CENTS = 3_000;

interface InvoiceScenario {
  invoiceRowId: string;
  invoiceId: InvoiceId;
  publicId: PublicId;
  userId: UserId;
}

async function seedSentInvoice(
  paidAmount = 0,
  totalCents = DEFAULT_TOTAL_CENTS
): Promise<InvoiceScenario> {
  const user = await createUser(prisma);
  const client = await createClient(prisma, { userId: user.id });
  const invoice = await makeInvoiceRow(prisma, {
    userId: user.id,
    clientId: client.id,
    status: INVOICE_STATUS.SENT,
    subtotal: totalCents,
    taxAmount: 0,
    total: totalCents,
    paidAmount,
  });

  return {
    invoiceRowId: invoice.id,
    invoiceId: asInvoiceId(invoice.id),
    publicId: asPublicId(invoice.publicId),
    userId: asUserId(user.id),
  };
}

let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  consoleWarn.mockClear();
  consoleError.mockClear();
});

afterAll(() => {
  consoleWarn.mockRestore();
  consoleError.mockRestore();
});

describe("markInvoicePaid — PROD-001 partial-paid guard", () => {
  it("flips a SENT invoice with zero paidAmount to PAID, creates a MANUAL Payment, and logs both events", async () => {
    const seed = await seedSentInvoice(0);

    const result = await markInvoicePaid(seed.invoiceId, seed.userId);

    expect(result).not.toBeNull();
    expect(result?.status).toBe(INVOICE_STATUS.PAID);
    expect(result?.paidAt).not.toBeNull();
    expect(result?.paymentMethod).toBe(PAYMENT_METHOD.MANUAL);
    expect(result?.paidAmount).toBe(DEFAULT_TOTAL_CENTS);

    const payments = await prisma.payment.findMany({ where: { invoiceId: seed.invoiceRowId } });

    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(DEFAULT_TOTAL_CENTS);
    expect(payments[0].method).toBe(PAYMENT_METHOD.MANUAL);

    const paidEvents = await prisma.invoiceEvent.findMany({
      where: { invoiceId: seed.invoiceRowId, type: INVOICE_EVENT.PAID_MANUAL },
    });
    const paymentEvents = await prisma.invoiceEvent.findMany({
      where: { invoiceId: seed.invoiceRowId, type: INVOICE_EVENT.PAYMENT_RECORDED },
    });

    expect(paidEvents).toHaveLength(1);
    expect(paymentEvents).toHaveLength(1);
  });

  it("returns null and writes nothing when the invoice already has a partial payment (PROD-001 regression)", async () => {
    const seed = await seedSentInvoice(PARTIAL_PAID_CENTS);
    const eventsBefore = await prisma.invoiceEvent.count({
      where: { invoiceId: seed.invoiceRowId },
    });
    const paymentsBefore = await prisma.payment.count({
      where: { invoiceId: seed.invoiceRowId },
    });

    const result = await markInvoicePaid(seed.invoiceId, seed.userId);

    expect(result).toBeNull();

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    expect(persisted.paidAmount).toBe(PARTIAL_PAID_CENTS);
    expect(persisted.paidAt).toBeNull();
    expect(persisted.status).toBe(INVOICE_STATUS.SENT);

    expect(await prisma.invoiceEvent.count({ where: { invoiceId: seed.invoiceRowId } })).toBe(
      eventsBefore
    );
    expect(await prisma.payment.count({ where: { invoiceId: seed.invoiceRowId } })).toBe(
      paymentsBefore
    );
  });
});

describe("markInvoiceViewed — CROSS-006 / REL-004 first-view-wins claim", () => {
  it("sets viewedAt and logs a VIEWED event on the first call", async () => {
    const seed = await seedSentInvoice(0);

    await markInvoiceViewed(seed.publicId);

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    expect(persisted.viewedAt).not.toBeNull();
    expect(persisted.status).toBe(INVOICE_STATUS.VIEWED);

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: seed.invoiceRowId, type: INVOICE_EVENT.VIEWED },
    });

    expect(events).toHaveLength(1);
  });

  it("logs exactly one VIEWED event when two concurrent markInvoiceViewed calls race", async () => {
    const seed = await seedSentInvoice(0);

    await Promise.all([markInvoiceViewed(seed.publicId), markInvoiceViewed(seed.publicId)]);

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: seed.invoiceRowId, type: INVOICE_EVENT.VIEWED },
    });

    expect(events).toHaveLength(1);

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    expect(persisted.viewedAt).not.toBeNull();
  });

  it("is a no-op on an already-viewed invoice (claim count = 0 branch)", async () => {
    const seed = await seedSentInvoice(0);

    await markInvoiceViewed(seed.publicId);

    const persistedAfterFirst = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });
    const firstViewedAt = persistedAfterFirst.viewedAt;

    await markInvoiceViewed(seed.publicId);

    const persistedAfterSecond = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    expect(persistedAfterSecond.viewedAt?.getTime()).toBe(firstViewedAt?.getTime());

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: seed.invoiceRowId, type: INVOICE_EVENT.VIEWED },
    });

    expect(events).toHaveLength(1);
  });
});
