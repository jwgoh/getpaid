import { prisma } from "@app/server/db";
import { RECURRING_INCLUDE } from "@app/server/recurring/include";

export async function getRecurringInvoices(userId: string) {
  return prisma.recurringInvoice.findMany({
    where: { userId },
    include: RECURRING_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
}

export async function getRecurringInvoice(userId: string, id: string) {
  return prisma.recurringInvoice.findFirst({
    where: { id, userId },
    include: RECURRING_INCLUDE,
  });
}
