import { faker } from "@faker-js/faker";
import type { Invoice, Prisma, PrismaClient } from "@prisma/client";
import { nanoid } from "nanoid";

import { NANOID } from "@app/shared/config/config";
import { INVOICE_STATUS } from "@app/shared/config/invoice-status";

const DEFAULT_SUBTOTAL_CENTS = 10_000;
const DEFAULT_TAX_CENTS = 2_000;
const DEFAULT_TOTAL_CENTS = 12_000;
const DEFAULT_PAID_CENTS = 0;
const DEFAULT_LINE_ITEM_UNIT_PRICE_CENTS = 5_000;
const DEFAULT_LINE_ITEM_QUANTITY = 1;

type InvoiceOverrides = Partial<Prisma.InvoiceUncheckedCreateInput> & {
  userId: string;
  clientId: string;
};

type InvoiceItemNestedInput = Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput;

type InvoiceItemSeed = {
  title?: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  sortOrder?: number;
};

type InvoiceWithItemsOverrides = InvoiceOverrides & { items?: InvoiceItemSeed[] };

function defaultInvoiceData(overrides: InvoiceOverrides): Prisma.InvoiceUncheckedCreateInput {
  return {
    publicId: nanoid(NANOID.PUBLIC_ID_LENGTH),
    status: INVOICE_STATUS.DRAFT,
    subtotal: DEFAULT_SUBTOTAL_CENTS,
    taxAmount: DEFAULT_TAX_CENTS,
    total: DEFAULT_TOTAL_CENTS,
    paidAmount: DEFAULT_PAID_CENTS,
    dueDate: faker.date.future(),
    ...overrides,
  };
}

export function makeInvoice(overrides: InvoiceOverrides): Prisma.InvoiceUncheckedCreateInput {
  return defaultInvoiceData(overrides);
}

export function createInvoice(prisma: PrismaClient, overrides: InvoiceOverrides): Promise<Invoice> {
  return prisma.invoice.create({ data: makeInvoice(overrides) });
}

function buildItemNestedInput(seed: InvoiceItemSeed): InvoiceItemNestedInput {
  const quantity = seed.quantity ?? DEFAULT_LINE_ITEM_QUANTITY;
  const unitPrice = seed.unitPrice ?? DEFAULT_LINE_ITEM_UNIT_PRICE_CENTS;

  return {
    title: seed.title ?? faker.commerce.productName(),
    description: seed.description ?? null,
    quantity,
    unitPrice,
    amount: seed.amount ?? quantity * unitPrice,
    sortOrder: seed.sortOrder ?? 0,
  };
}

export function makeInvoiceWithItems(
  overrides: InvoiceWithItemsOverrides
): Prisma.InvoiceUncheckedCreateInput {
  const { items, ...rest } = overrides;
  const base = defaultInvoiceData(rest);

  if (!items || items.length === 0) {
    return base;
  }

  return {
    ...base,
    items: { create: items.map(buildItemNestedInput) },
  };
}

export function createInvoiceWithItems(
  prisma: PrismaClient,
  overrides: InvoiceWithItemsOverrides
): Promise<Invoice> {
  return prisma.invoice.create({ data: makeInvoiceWithItems(overrides) });
}
