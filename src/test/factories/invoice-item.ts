import { faker } from "@faker-js/faker";
import type { InvoiceItem, InvoiceItemGroup, Prisma, PrismaClient } from "@prisma/client";

const DEFAULT_QUANTITY = 1;
const DEFAULT_UNIT_PRICE_CENTS = 5_000;
const DEFAULT_SORT_ORDER = 0;

type InvoiceItemGroupOverrides = Partial<Prisma.InvoiceItemGroupUncheckedCreateInput> & {
  invoiceId: string;
};

type InvoiceItemOverrides = Partial<Prisma.InvoiceItemUncheckedCreateInput> & {
  invoiceId: string;
};

export function makeInvoiceItemGroup(
  overrides: InvoiceItemGroupOverrides
): Prisma.InvoiceItemGroupUncheckedCreateInput {
  return {
    title: faker.commerce.department(),
    sortOrder: DEFAULT_SORT_ORDER,
    ...overrides,
  };
}

export function createInvoiceItemGroup(
  prisma: PrismaClient,
  overrides: InvoiceItemGroupOverrides
): Promise<InvoiceItemGroup> {
  return prisma.invoiceItemGroup.create({ data: makeInvoiceItemGroup(overrides) });
}

export function makeInvoiceItem(
  overrides: InvoiceItemOverrides
): Prisma.InvoiceItemUncheckedCreateInput {
  const quantity = overrides.quantity ?? DEFAULT_QUANTITY;
  const unitPrice = overrides.unitPrice ?? DEFAULT_UNIT_PRICE_CENTS;

  return {
    title: faker.commerce.productName(),
    quantity,
    unitPrice,
    amount: quantity * unitPrice,
    sortOrder: DEFAULT_SORT_ORDER,
    ...overrides,
  };
}

export function createInvoiceItem(
  prisma: PrismaClient,
  overrides: InvoiceItemOverrides
): Promise<InvoiceItem> {
  return prisma.invoiceItem.create({ data: makeInvoiceItem(overrides) });
}
