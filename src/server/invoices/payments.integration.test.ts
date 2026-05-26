import type { Invoice } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { PAYMENT_METHOD } from "@app/shared/config/payment-method";
import {
  asInvoiceId,
  asPaymentId,
  asUserId,
  type InvoiceId,
  type UserId,
} from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { deletePayment, PaymentExceedsBalanceError, recordPayment } from "@app/server/invoices";

import {
  createClient,
  createInvoice as makeInvoiceRow,
  createPayment,
  createUser,
} from "@app/test/factories";

const HUNDRED_DOLLARS_CENTS = 10_000;
const FIFTY_DOLLARS_CENTS = 5_000;
const ONE_DOLLAR_CENTS = 100;
const RACE_PAYMENT_CENTS = 6_000;

interface PaymentScenario {
  invoice: Invoice;
  invoiceId: InvoiceId;
  userId: UserId;
}

async function seedInvoice(
  status: (typeof INVOICE_STATUS)[keyof typeof INVOICE_STATUS] = INVOICE_STATUS.SENT,
  totalCents: number = HUNDRED_DOLLARS_CENTS,
  paidCents: number = 0
): Promise<PaymentScenario> {
  const user = await createUser(prisma);
  const client = await createClient(prisma, { userId: user.id });
  const invoice = await makeInvoiceRow(prisma, {
    userId: user.id,
    clientId: client.id,
    status,
    subtotal: totalCents,
    taxAmount: 0,
    total: totalCents,
    paidAmount: paidCents,
  });

  return {
    invoice,
    invoiceId: asInvoiceId(invoice.id),
    userId: asUserId(user.id),
  };
}

let consoleWarn: ReturnType<typeof vi.spyOn> | undefined;
let consoleError: ReturnType<typeof vi.spyOn> | undefined;

beforeAll(() => {
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

beforeEach(() => {
  consoleWarn?.mockClear();
  consoleError?.mockClear();
});

afterAll(() => {
  consoleWarn?.mockRestore();
  consoleError?.mockRestore();
});

describe("recordPayment — balance computation", () => {
  it("persists a Payment row, increments paidAmount, and logs PAYMENT_RECORDED on a partial payment", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, HUNDRED_DOLLARS_CENTS, 0);

    const result = await recordPayment(scenario.invoiceId, scenario.userId, {
      amount: FIFTY_DOLLARS_CENTS,
      method: PAYMENT_METHOD.BANK_TRANSFER,
    });

    expect(result).not.toBeNull();

    const payments = await prisma.payment.findMany({ where: { invoiceId: scenario.invoice.id } });

    expect(payments).toHaveLength(1);
    expect(payments[0].amount).toBe(FIFTY_DOLLARS_CENTS);
    expect(payments[0].method).toBe(PAYMENT_METHOD.BANK_TRANSFER);

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.paidAmount).toBe(FIFTY_DOLLARS_CENTS);
    expect(after.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: scenario.invoice.id, type: INVOICE_EVENT.PAYMENT_RECORDED },
    });

    expect(events).toHaveLength(1);
  });

  it("flips status to PAID and sets paidAt + paymentMethod when the payment closes the balance exactly", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, FIFTY_DOLLARS_CENTS, 0);

    const result = await recordPayment(scenario.invoiceId, scenario.userId, {
      amount: FIFTY_DOLLARS_CENTS,
      method: PAYMENT_METHOD.MANUAL,
    });

    expect(result).not.toBeNull();

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.status).toBe(INVOICE_STATUS.PAID);
    expect(after.paidAt).not.toBeNull();
    expect(after.paymentMethod).toBe(PAYMENT_METHOD.MANUAL);
    expect(after.paidAmount).toBe(FIFTY_DOLLARS_CENTS);
  });

  it("flips status to PARTIALLY_PAID when a positive balance remains after the payment", async () => {
    const scenario = await seedInvoice(
      INVOICE_STATUS.SENT,
      HUNDRED_DOLLARS_CENTS,
      ONE_DOLLAR_CENTS
    );

    await recordPayment(scenario.invoiceId, scenario.userId, {
      amount: FIFTY_DOLLARS_CENTS,
      method: PAYMENT_METHOD.MANUAL,
    });

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.status).toBe(INVOICE_STATUS.PARTIALLY_PAID);
    expect(after.paidAmount).toBe(ONE_DOLLAR_CENTS + FIFTY_DOLLARS_CENTS);
    expect(after.paidAt).toBeNull();
  });
});

describe("recordPayment — Invoice_paidAmount_lte_total_check boundary", () => {
  it("rejects payment that overshoots remaining balance via Invoice_paidAmount_lte_total_check and rolls back", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, FIFTY_DOLLARS_CENTS, 0);

    await expect(
      recordPayment(scenario.invoiceId, scenario.userId, {
        amount: HUNDRED_DOLLARS_CENTS,
        method: PAYMENT_METHOD.BANK_TRANSFER,
      })
    ).rejects.toBeInstanceOf(PaymentExceedsBalanceError);

    const payments = await prisma.payment.findMany({ where: { invoiceId: scenario.invoice.id } });

    expect(payments).toHaveLength(0);

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.paidAmount).toBe(0);
    expect(after.status).toBe(INVOICE_STATUS.SENT);
  });

  it("rejects a direct prisma.invoice.update that pushes paidAmount above total at the Postgres CHECK level", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, FIFTY_DOLLARS_CENTS, 0);

    await expect(
      prisma.invoice.update({
        where: { id: scenario.invoice.id },
        data: { paidAmount: FIFTY_DOLLARS_CENTS + ONE_DOLLAR_CENTS },
      })
    ).rejects.toThrow();

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.paidAmount).toBe(0);
  });

  it("keeps paidAmount within total when two concurrent recordPayment calls race for the same invoice", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, HUNDRED_DOLLARS_CENTS, 0);

    const results = await Promise.allSettled([
      recordPayment(scenario.invoiceId, scenario.userId, {
        amount: RACE_PAYMENT_CENTS,
        method: PAYMENT_METHOD.BANK_TRANSFER,
      }),
      recordPayment(scenario.invoiceId, scenario.userId, {
        amount: RACE_PAYMENT_CENTS,
        method: PAYMENT_METHOD.BANK_TRANSFER,
      }),
    ]);

    expect(results).toHaveLength(2);

    const rejected = results.filter((r) => r.status === "rejected");

    expect(rejected.length).toBeGreaterThan(0);

    for (const r of rejected) {
      expect(r.reason).toBeInstanceOf(PaymentExceedsBalanceError);
    }

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.paidAmount).toBeLessThanOrEqual(HUNDRED_DOLLARS_CENTS);
    expect(after.paidAmount).toBeGreaterThanOrEqual(RACE_PAYMENT_CENTS);
  });
});

describe("deletePayment integration", () => {
  it("removes the Payment row, decrements paidAmount, and logs PAYMENT_DELETED", async () => {
    const scenario = await seedInvoice(
      INVOICE_STATUS.PARTIALLY_PAID,
      HUNDRED_DOLLARS_CENTS,
      FIFTY_DOLLARS_CENTS
    );
    const payment = await createPayment(prisma, {
      invoiceId: scenario.invoice.id,
      amount: FIFTY_DOLLARS_CENTS,
      method: PAYMENT_METHOD.MANUAL,
    });

    const result = await deletePayment(
      scenario.invoiceId,
      asPaymentId(payment.id),
      scenario.userId
    );

    expect(result).not.toBeNull();

    const remaining = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(remaining).toBeNull();

    const after = await prisma.invoice.findUniqueOrThrow({ where: { id: scenario.invoice.id } });

    expect(after.paidAmount).toBe(0);

    const events = await prisma.invoiceEvent.findMany({
      where: { invoiceId: scenario.invoice.id, type: INVOICE_EVENT.PAYMENT_DELETED },
    });

    expect(events).toHaveLength(1);
  });

  it("returns null instead of throwing when the parent invoice was deleted before deletePayment runs (fix 60d0e8d)", async () => {
    const scenario = await seedInvoice(
      INVOICE_STATUS.PARTIALLY_PAID,
      HUNDRED_DOLLARS_CENTS,
      FIFTY_DOLLARS_CENTS
    );
    const payment = await createPayment(prisma, {
      invoiceId: scenario.invoice.id,
      amount: FIFTY_DOLLARS_CENTS,
      method: PAYMENT_METHOD.MANUAL,
    });

    await prisma.invoice.delete({ where: { id: scenario.invoice.id } });

    const result = await deletePayment(
      scenario.invoiceId,
      asPaymentId(payment.id),
      scenario.userId
    );

    expect(result).toBeNull();

    const remaining = await prisma.payment.findUnique({ where: { id: payment.id } });

    expect(remaining).toBeNull();
  });

  it("rejects a direct prisma.payment.create with amount = 0 via Payment_amount_positive_check (QA-001 boundary)", async () => {
    const scenario = await seedInvoice(INVOICE_STATUS.SENT, HUNDRED_DOLLARS_CENTS, 0);

    await expect(
      prisma.payment.create({
        data: {
          invoiceId: scenario.invoice.id,
          amount: 0,
          method: PAYMENT_METHOD.MANUAL,
        },
      })
    ).rejects.toThrow();

    const payments = await prisma.payment.findMany({ where: { invoiceId: scenario.invoice.id } });

    expect(payments).toHaveLength(0);
  });
});
