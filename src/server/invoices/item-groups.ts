import { Prisma } from "@prisma/client";

import { InvoiceItemGroupInput } from "@app/shared/schemas";

import { prisma } from "@app/server/db";

type PrismaClientLike = Prisma.TransactionClient | typeof prisma;

export async function createItemGroups(
  tx: PrismaClientLike,
  invoiceId: string,
  groups: InvoiceItemGroupInput[]
) {
  for (let gi = 0; gi < groups.length; gi++) {
    const group = groups[gi];
    const created = await tx.invoiceItemGroup.create({
      data: {
        invoiceId,
        title: group.title,
        sortOrder: gi,
      },
    });

    if (group.items.length > 0) {
      await tx.invoiceItem.createMany({
        data: group.items.map((item, ii) => ({
          invoiceId,
          groupId: created.id,
          title: item.title,
          description: item.description ?? null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          amount: Math.round(Math.round(item.quantity * item.unitPrice)),
          sortOrder: ii,
        })),
      });
    }
  }
}

export const ITEM_GROUPS_INCLUDE = {
  include: { items: { orderBy: { sortOrder: "asc" as const } } },
  orderBy: { sortOrder: "asc" as const },
};
