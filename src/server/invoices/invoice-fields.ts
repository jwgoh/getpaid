import { Prisma } from "@prisma/client";

import type { UserId } from "@app/shared/types/ids";

import { ITEM_GROUPS_INCLUDE } from "./item-groups";

export const INVOICE_WITH_RELATIONS_INCLUDE = {
  client: true,
  items: { where: { groupId: null }, orderBy: { sortOrder: "asc" } },
  itemGroups: ITEM_GROUPS_INCLUDE,
} as const satisfies Prisma.InvoiceInclude;

export type InvoiceWithRelations = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_WITH_RELATIONS_INCLUDE;
}>;

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}

export class MoneyOverflowError extends Error {
  constructor() {
    super("Invoice total is too large");
    this.name = "MoneyOverflowError";
  }
}

export async function assertClientOwned(
  tx: Prisma.TransactionClient,
  clientId: string,
  userId: UserId
): Promise<void> {
  const client = await tx.client.findFirst({
    where: { id: clientId, userId },
    select: { id: true },
  });

  if (!client) {
    throw new ClientNotFoundError();
  }
}
