import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { type UpdateInvoiceInput } from "@app/shared/schemas";
import { SCHEMA_LIMITS } from "@app/shared/schemas/limits";
import { asInvoiceId, asUserId, type InvoiceId, type UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { MoneyOverflowError, updateInvoice } from "@app/server/invoices";

import {
  createClient,
  createInvoice as makeInvoiceRow,
  createInvoiceItem,
  createUser,
} from "@app/test/factories";

const DEFAULT_LINE_QUANTITY = 1;
const DEFAULT_LINE_UNIT_PRICE_CENTS = 10_000;
const DEFAULT_LINE_AMOUNT_CENTS = DEFAULT_LINE_QUANTITY * DEFAULT_LINE_UNIT_PRICE_CENTS;
const OVERFLOW_TAX_RATE_PCT = 10;
const UPDATED_NOTES = "updated notes";
const UPDATED_MESSAGE = "updated message";
const DAYS_IN_FUTURE = 30;

interface DraftScenario {
  invoiceId: InvoiceId;
  userId: UserId;
  invoiceRowId: string;
}

async function seedDraftInvoiceWithItem(taxRate = 0): Promise<DraftScenario> {
  const user = await createUser(prisma);
  const client = await createClient(prisma, { userId: user.id });
  const invoice = await makeInvoiceRow(prisma, {
    userId: user.id,
    clientId: client.id,
    status: INVOICE_STATUS.DRAFT,
    subtotal: DEFAULT_LINE_AMOUNT_CENTS,
    taxRate,
    taxAmount: 0,
    total: DEFAULT_LINE_AMOUNT_CENTS,
    paidAmount: 0,
    notes: "original notes",
    message: "original message",
    dueDate: new Date(Date.now() + DAYS_IN_FUTURE * 24 * 60 * 60 * 1000),
  });

  await createInvoiceItem(prisma, {
    invoiceId: invoice.id,
    title: "Original line",
    quantity: DEFAULT_LINE_QUANTITY,
    unitPrice: DEFAULT_LINE_UNIT_PRICE_CENTS,
  });

  return {
    invoiceId: asInvoiceId(invoice.id),
    userId: asUserId(user.id),
    invoiceRowId: invoice.id,
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

describe("updateInvoice — happy paths", () => {
  it("updates a DRAFT invoice's metadata and recomputes totals when items change", async () => {
    const seed = await seedDraftInvoiceWithItem();
    const newUnitPrice = 20_000;
    const newQuantity = 2;

    const payload: UpdateInvoiceInput = {
      notes: UPDATED_NOTES,
      items: [
        {
          title: "Updated line",
          quantity: newQuantity,
          unitPrice: newUnitPrice,
        },
      ],
      itemGroups: [],
    };

    const result = await updateInvoice(seed.invoiceId, seed.userId, payload);

    expect(result).not.toBeNull();
    expect(result?.notes).toBe(UPDATED_NOTES);
    expect(result?.total).toBe(newQuantity * newUnitPrice);
    expect(result?.subtotal).toBe(newQuantity * newUnitPrice);

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
      include: { items: true },
    });

    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0].title).toBe("Updated line");
    expect(persisted.items[0].quantity).toBe(newQuantity);
    expect(persisted.items[0].unitPrice).toBe(newUnitPrice);
  });
});

describe("updateInvoice — DRAFT guard", () => {
  it("returns null and writes nothing for a non-DRAFT invoice", async () => {
    const user = await createUser(prisma);
    const client = await createClient(prisma, { userId: user.id });
    const invoice = await makeInvoiceRow(prisma, {
      userId: user.id,
      clientId: client.id,
      status: INVOICE_STATUS.SENT,
      notes: "original",
    });

    const result = await updateInvoice(asInvoiceId(invoice.id), asUserId(user.id), {
      notes: "new value",
    });

    expect(result).toBeNull();

    const persisted = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });

    expect(persisted.notes).toBe("original");
    expect(persisted.status).toBe(INVOICE_STATUS.SENT);
  });
});

describe("updateInvoice — money overflow service guard (schema-vs-code drift)", () => {
  it("throws MoneyOverflowError when items pass schema but the persisted taxRate amplifies total above MONEY_MAX_CENTS", async () => {
    const seed = await seedDraftInvoiceWithItem(OVERFLOW_TAX_RATE_PCT);

    const itemsBefore = await prisma.invoiceItem.findMany({
      where: { invoiceId: seed.invoiceRowId },
    });
    const invoiceBefore = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    const overflowPayload: UpdateInvoiceInput = {
      items: [
        {
          title: "Overflow line",
          quantity: SCHEMA_LIMITS.QUANTITY_MAX,
          unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
        },
      ],
      itemGroups: [],
    };

    await expect(
      updateInvoice(seed.invoiceId, seed.userId, overflowPayload)
    ).rejects.toBeInstanceOf(MoneyOverflowError);

    const invoiceAfter = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });
    const itemsAfter = await prisma.invoiceItem.findMany({
      where: { invoiceId: seed.invoiceRowId },
    });

    expect(invoiceAfter.total).toBe(invoiceBefore.total);
    expect(invoiceAfter.subtotal).toBe(invoiceBefore.subtotal);
    expect(itemsAfter).toHaveLength(itemsBefore.length);
    expect(itemsAfter[0].title).toBe(itemsBefore[0].title);
  });
});

describe("updateInvoice — concurrent updates", () => {
  it("preserves both field updates when two concurrent updateInvoice calls touch different metadata fields", async () => {
    const seed = await seedDraftInvoiceWithItem();

    const results = await Promise.all([
      updateInvoice(seed.invoiceId, seed.userId, { notes: UPDATED_NOTES }),
      updateInvoice(seed.invoiceId, seed.userId, { message: UPDATED_MESSAGE }),
    ]);

    expect(results[0]).not.toBeNull();
    expect(results[1]).not.toBeNull();

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: seed.invoiceRowId },
    });

    expect(persisted.notes).toBe(UPDATED_NOTES);
    expect(persisted.message).toBe(UPDATED_MESSAGE);
  });
});
