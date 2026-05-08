import { prisma } from "@app/server/db";
import {
  RECURRING_INCLUDE,
  type RecurringInvoiceWithRelations,
} from "@app/server/recurring/include";

export async function getRecurringInvoices(
  userId: string
): Promise<RecurringInvoiceWithRelations[]> {
  return prisma.recurringInvoice.findMany({
    where: { userId },
    include: RECURRING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecurringInvoice(
  userId: string,
  id: string
): Promise<RecurringInvoiceWithRelations | null> {
  return prisma.recurringInvoice.findFirst({
    where: { id, userId },
    include: RECURRING_INCLUDE,
  });
}
