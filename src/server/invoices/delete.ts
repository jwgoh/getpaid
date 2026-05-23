import type { InvoiceId, UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";

export async function deleteInvoice(
  id: InvoiceId,
  userId: UserId
): Promise<{ success: true } | null> {
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId },
  });

  if (!invoice) {
    return null;
  }

  await prisma.invoice.delete({
    where: { id },
  });

  return { success: true };
}
