import type { Prisma } from "@prisma/client";

export const RECURRING_INCLUDE = {
  client: { select: { id: true, name: true, email: true } },
  items: { orderBy: { sortOrder: "asc" } },
  itemGroups: {
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  },
} as const satisfies Prisma.RecurringInvoiceInclude;

export type RecurringInvoiceWithRelations = Prisma.RecurringInvoiceGetPayload<{
  include: typeof RECURRING_INCLUDE;
}>;
