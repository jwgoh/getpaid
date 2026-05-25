import { Prisma } from "@prisma/client";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import { type CreateInvoiceInput } from "@app/shared/schemas";
import { SCHEMA_LIMITS } from "@app/shared/schemas/limits";
import { asUserId, type UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { ClientNotFoundError, createInvoice, MoneyOverflowError } from "@app/server/invoices";

import { createClient, createUser } from "@app/test/factories";

const DEFAULT_QUANTITY = 1;
const DEFAULT_UNIT_PRICE_CENTS = 10_000;
const DEFAULT_LINE_AMOUNT_CENTS = DEFAULT_QUANTITY * DEFAULT_UNIT_PRICE_CENTS;
const DAYS_IN_FUTURE = 30;
const OVERFLOW_TAX_RATE_PCT = 10;
const PG_CHECK_VIOLATION_CODE = "P2010";

interface UserClientPair {
  userId: UserId;
  clientId: string;
}

async function seedUserAndClient(): Promise<UserClientPair> {
  const user = await createUser(prisma);
  const client = await createClient(prisma, { userId: user.id });

  return { userId: asUserId(user.id), clientId: client.id };
}

function futureDueDate(): Date {
  return new Date(Date.now() + DAYS_IN_FUTURE * 24 * 60 * 60 * 1000);
}

function buildBaseInput(clientId: string): CreateInvoiceInput {
  return {
    clientId,
    currency: "USD",
    dueDate: futureDueDate(),
    items: [
      {
        title: "Consulting",
        quantity: DEFAULT_QUANTITY,
        unitPrice: DEFAULT_UNIT_PRICE_CENTS,
      },
    ],
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

describe("createInvoice — happy path", () => {
  it("persists invoice, items, and a CREATED event with computed totals", async () => {
    const seed = await seedUserAndClient();

    const result = await createInvoice(seed.userId, buildBaseInput(seed.clientId));

    expect(result).not.toBeNull();
    expect(result.userId).toBe(seed.userId);
    expect(result.clientId).toBe(seed.clientId);
    expect(result.status).toBe(INVOICE_STATUS.DRAFT);
    expect(result.subtotal).toBe(DEFAULT_LINE_AMOUNT_CENTS);
    expect(result.total).toBe(DEFAULT_LINE_AMOUNT_CENTS);
    expect(result.paidAmount).toBe(0);

    const persisted = await prisma.invoice.findUniqueOrThrow({
      where: { id: result.id },
      include: { items: true, events: true },
    });

    expect(persisted.items).toHaveLength(1);
    expect(persisted.items[0].quantity).toBe(DEFAULT_QUANTITY);
    expect(persisted.items[0].unitPrice).toBe(DEFAULT_UNIT_PRICE_CENTS);
    expect(persisted.events.some((e) => e.type === INVOICE_EVENT.CREATED)).toBe(true);
  });
});

describe("createInvoice — money overflow service guard", () => {
  it("throws MoneyOverflowError when taxed total exceeds MONEY_MAX_CENTS and writes nothing (schema-vs-code drift closure)", async () => {
    const seed = await seedUserAndClient();
    const invoicesBefore = await prisma.invoice.count();
    const itemsBefore = await prisma.invoiceItem.count();
    const eventsBefore = await prisma.invoiceEvent.count();

    const overflowInput: CreateInvoiceInput = {
      clientId: seed.clientId,
      currency: "USD",
      dueDate: futureDueDate(),
      items: [
        {
          title: "Massive line",
          quantity: SCHEMA_LIMITS.QUANTITY_MAX,
          unitPrice: SCHEMA_LIMITS.MONEY_MAX_LINE_ITEM_CENTS,
        },
      ],
      taxRate: OVERFLOW_TAX_RATE_PCT,
    };

    await expect(createInvoice(seed.userId, overflowInput)).rejects.toBeInstanceOf(
      MoneyOverflowError
    );

    expect(await prisma.invoice.count()).toBe(invoicesBefore);
    expect(await prisma.invoiceItem.count()).toBe(itemsBefore);
    expect(await prisma.invoiceEvent.count()).toBe(eventsBefore);
  });

  it("rejects a direct prisma.invoice.create with a negative total at the Postgres CHECK level", async () => {
    const seed = await seedUserAndClient();

    await expect(
      prisma.invoice.create({
        data: {
          userId: seed.userId,
          clientId: seed.clientId,
          publicId: "neg-test-pub",
          dueDate: futureDueDate(),
          subtotal: 0,
          total: -1,
        },
      })
    ).rejects.toMatchObject({ code: PG_CHECK_VIOLATION_CODE });

    const after = await prisma.invoice.findMany({ where: { userId: seed.userId } });

    expect(after).toHaveLength(0);
  });

  it("rejects a direct prisma.invoiceItem.create with quantity = 0 via InvoiceItem_quantity_positive_check", async () => {
    const seed = await seedUserAndClient();
    const invoice = await prisma.invoice.create({
      data: {
        userId: seed.userId,
        clientId: seed.clientId,
        publicId: "qty-zero-pub",
        dueDate: futureDueDate(),
        subtotal: 0,
        total: 0,
      },
    });

    await expect(
      prisma.invoiceItem.create({
        data: {
          invoiceId: invoice.id,
          title: "Zero quantity",
          quantity: 0,
          unitPrice: 100,
          amount: 0,
        },
      })
    ).rejects.toBeInstanceOf(Prisma.PrismaClientKnownRequestError);

    const items = await prisma.invoiceItem.findMany({ where: { invoiceId: invoice.id } });

    expect(items).toHaveLength(0);
  });
});

describe("createInvoice — ownership enforcement", () => {
  it("rejects an invoice that references a client owned by another user and rolls back", async () => {
    const ownerA = await createUser(prisma);
    const ownerB = await createUser(prisma);
    const clientOfB = await createClient(prisma, { userId: ownerB.id });
    const invoicesBefore = await prisma.invoice.count();

    await expect(
      createInvoice(asUserId(ownerA.id), buildBaseInput(clientOfB.id))
    ).rejects.toBeInstanceOf(ClientNotFoundError);

    expect(await prisma.invoice.count()).toBe(invoicesBefore);
  });
});
