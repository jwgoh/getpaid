import { CreateClientInput, UpdateClientInput } from "@app/shared/schemas";
import type { ClientId, UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";

export class ClientHasDependentsError extends Error {
  constructor(
    public invoiceCount: number,
    public recurringCount: number
  ) {
    super("Client has dependent invoices or recurring schedules");
    this.name = "ClientHasDependentsError";
  }
}

export async function getClients(userId: UserId) {
  return prisma.client.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getClient(id: ClientId, userId: UserId) {
  return prisma.client.findFirst({
    where: { id, userId },
  });
}

export async function createClient(userId: UserId, data: CreateClientInput) {
  return prisma.client.create({
    data: {
      userId,
      name: data.name,
      email: data.email,
      defaultRate: data.defaultRate ?? null,
    },
  });
}

export async function updateClient(id: ClientId, userId: UserId, data: UpdateClientInput) {
  const client = await prisma.client.findFirst({
    where: { id, userId },
  });

  if (!client) {
    return null;
  }

  return prisma.client.update({
    where: { id },
    data: {
      name: data.name ?? client.name,
      email: data.email ?? client.email,
      defaultRate: data.defaultRate !== undefined ? (data.defaultRate ?? null) : client.defaultRate,
    },
  });
}

export async function deleteClient(id: ClientId, userId: UserId) {
  const client = await prisma.client.findFirst({
    where: { id, userId },
  });

  if (!client) {
    return null;
  }

  const [invoiceCount, recurringCount] = await Promise.all([
    prisma.invoice.count({ where: { clientId: id } }),
    prisma.recurringInvoice.count({ where: { clientId: id } }),
  ]);

  if (invoiceCount > 0 || recurringCount > 0) {
    throw new ClientHasDependentsError(invoiceCount, recurringCount);
  }

  return prisma.client.delete({
    where: { id },
  });
}
