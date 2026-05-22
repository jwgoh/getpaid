import { beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { asPublicId } from "@app/shared/types/ids";

const prismaInvoice = { updateMany: vi.fn(), findUnique: vi.fn() };
const txInvoice = { updateMany: vi.fn(), findUnique: vi.fn() };
const txInvoiceEvent = { create: vi.fn() };
const transaction = vi.fn();

vi.mock("@app/server/db", () => ({
  prisma: { invoice: prismaInvoice, $transaction: transaction },
}));

const PUBLIC_ID = asPublicId("public-inv-1");

async function loadMarkInvoiceViewed() {
  const imported = await import("./lifecycle");

  return imported.markInvoiceViewed;
}

beforeEach(() => {
  prismaInvoice.updateMany.mockReset();
  prismaInvoice.findUnique.mockReset();
  txInvoice.updateMany.mockReset();
  txInvoice.findUnique.mockReset();
  txInvoiceEvent.create.mockReset();
  transaction.mockReset();
  transaction.mockImplementation((run: (tx: unknown) => unknown) =>
    run({ invoice: txInvoice, invoiceEvent: txInvoiceEvent })
  );
});

describe("markInvoiceViewed (CROSS-006 / REL-004)", () => {
  it("logs exactly one VIEWED event when the first-view claim wins", async () => {
    prismaInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.findUnique.mockResolvedValue({ id: "inv-1" });
    prismaInvoice.findUnique.mockResolvedValue({ id: "inv-1" });

    const markInvoiceViewed = await loadMarkInvoiceViewed();

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

    const markInvoiceViewed = await loadMarkInvoiceViewed();

    await markInvoiceViewed(PUBLIC_ID);

    expect(transaction).not.toHaveBeenCalled();
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
  });

  it("skips the VIEWED event when the invoice vanishes inside the claim transaction", async () => {
    prismaInvoice.updateMany.mockResolvedValue({ count: 1 });
    txInvoice.updateMany.mockResolvedValue({ count: 0 });
    txInvoice.findUnique.mockResolvedValue(null);
    prismaInvoice.findUnique.mockResolvedValue(null);

    const markInvoiceViewed = await loadMarkInvoiceViewed();

    await markInvoiceViewed(PUBLIC_ID);

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(txInvoiceEvent.create).not.toHaveBeenCalled();
  });
});
