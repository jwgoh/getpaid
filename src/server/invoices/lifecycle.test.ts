import { beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { PAYMENT_METHOD } from "@app/shared/config/payment-method";
import { asInvoiceId, asPublicId, asUserId } from "@app/shared/types/ids";

const prismaInvoice = { updateMany: vi.fn(), findUnique: vi.fn() };
const txInvoice = {
  updateMany: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
};
const txInvoiceEvent = { create: vi.fn() };
const txPayment = { create: vi.fn() };
const transaction = vi.fn();

vi.mock("@app/server/db", () => ({
  prisma: { invoice: prismaInvoice, $transaction: transaction },
}));

const PUBLIC_ID = asPublicId("public-inv-1");
const INVOICE_ID = asInvoiceId("inv-1");
const USER_ID = asUserId("user-1");

async function loadLifecycle() {
  return import("./lifecycle");
}

beforeEach(() => {
  prismaInvoice.updateMany.mockReset();
  prismaInvoice.findUnique.mockReset();
  txInvoice.updateMany.mockReset();
  txInvoice.findUnique.mockReset();
  txInvoice.findFirst.mockReset();
  txInvoice.findUniqueOrThrow.mockReset();
  txInvoiceEvent.create.mockReset();
  txPayment.create.mockReset();
  transaction.mockReset();
  transaction.mockImplementation((run: (tx: unknown) => unknown) =>
    run({ invoice: txInvoice, invoiceEvent: txInvoiceEvent, payment: txPayment })
  );
});

describe("markInvoiceViewed (CROSS-006 / REL-004)", () => {
  it("logs exactly one VIEWED event when the first-view claim wins", async () => {
    prismaInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.findUnique.mockResolvedValue({ id: "inv-1" });
    prismaInvoice.findUnique.mockResolvedValue({ id: "inv-1" });

    const { markInvoiceViewed } = await loadLifecycle();

    await markInvoiceViewed(PUBLIC_ID);

    expect(prismaInvoice.updateMany).toHaveBeenCalledWith({
      where: { publicId: PUBLIC_ID, viewedAt: null },
      data: { viewedAt: expect.any(Date) },
    });
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txInvoice.updateMany).toHaveBeenCalledWith({
      where: { publicId: PUBLIC_ID, status: INVOICE_STATUS.SENT },
      data: { status: INVOICE_STATUS.VIEWED },
    });
    expect(txInvoiceEvent.create).toHaveBeenCalledTimes(1);
    expect(txInvoiceEvent.create).toHaveBeenCalledWith({
      data: { invoiceId: "inv-1", type: INVOICE_EVENT.VIEWED, payload: {} },
    });
  });

  it("does not open the transaction or log an event when the claim loses the race", async () => {
    prismaInvoice.updateMany.mockResolvedValue({ count: 0 });
    prismaInvoice.findUnique.mockResolvedValue({ id: "inv-1" });

    const { markInvoiceViewed } = await loadLifecycle();

    await markInvoiceViewed(PUBLIC_ID);

    expect(transaction).not.toHaveBeenCalled();
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
  });

  it("skips the VIEWED event when the invoice vanishes inside the claim transaction", async () => {
    prismaInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.updateMany.mockResolvedValue({ count: 0 });
    txInvoice.findUnique.mockResolvedValue(null);
    prismaInvoice.findUnique.mockResolvedValue(null);

    const { markInvoiceViewed } = await loadLifecycle();

    await markInvoiceViewed(PUBLIC_ID);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
  });
});

describe("markInvoicePaid (PROD-002 TOCTOU close + Payment-row write)", () => {
  it("creates a MANUAL Payment row and writes both events when the claim wins", async () => {
    txInvoice.findFirst.mockResolvedValue({ id: "inv-1", total: 5000 });
    txInvoice.updateMany.mockResolvedValue({ count: 1 });
    txPayment.create.mockResolvedValue({ id: "pmt-1" });
    txInvoice.findUniqueOrThrow.mockResolvedValue({ id: "inv-1" });

    const { markInvoicePaid } = await loadLifecycle();

    const result = await markInvoicePaid(INVOICE_ID, USER_ID);

    expect(txInvoice.findFirst).toHaveBeenCalledWith({
      where: { id: INVOICE_ID, userId: USER_ID, paidAt: null, paidAmount: 0 },
    });
    expect(txInvoice.updateMany).toHaveBeenCalledWith({
      where: { id: INVOICE_ID, paidAt: null, paidAmount: 0 },
      data: {
        status: INVOICE_STATUS.PAID,
        paidAt: expect.any(Date),
        paymentMethod: PAYMENT_METHOD.MANUAL,
        paidAmount: 5000,
      },
    });
    expect(txPayment.create).toHaveBeenCalledWith({
      data: {
        invoiceId: "inv-1",
        amount: 5000,
        method: PAYMENT_METHOD.MANUAL,
        paidAt: expect.any(Date),
      },
    });
    expect(txInvoiceEvent.create).toHaveBeenCalledTimes(2);
    expect(txInvoiceEvent.create).toHaveBeenNthCalledWith(1, {
      data: {
        invoiceId: "inv-1",
        type: INVOICE_EVENT.PAYMENT_RECORDED,
        payload: { amount: 5000, method: PAYMENT_METHOD.MANUAL, paymentId: "pmt-1" },
      },
    });
    expect(txInvoiceEvent.create).toHaveBeenNthCalledWith(2, {
      data: { invoiceId: "inv-1", type: INVOICE_EVENT.PAID_MANUAL, payload: {} },
    });
    expect(result).toEqual({ id: "inv-1" });
  });

  it("returns null without writing a Payment when the invoice is not found or already paid", async () => {
    txInvoice.findFirst.mockResolvedValue(null);

    const { markInvoicePaid } = await loadLifecycle();

    const result = await markInvoicePaid(INVOICE_ID, USER_ID);

    expect(result).toBeNull();
    expect(txInvoice.updateMany).not.toHaveBeenCalled();
    expect(txPayment.create).not.toHaveBeenCalled();
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
    expect(txInvoice.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("returns null when the claim loses the race after finding the invoice", async () => {
    txInvoice.findFirst.mockResolvedValue({ id: "inv-1", total: 5000 });
    txInvoice.updateMany.mockResolvedValue({ count: 0 });

    const { markInvoicePaid } = await loadLifecycle();

    const result = await markInvoicePaid(INVOICE_ID, USER_ID);

    expect(result).toBeNull();
    expect(txPayment.create).not.toHaveBeenCalled();
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
    expect(txInvoice.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
