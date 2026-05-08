import { Prisma, type RecurringFrequency, type RecurringStatus } from "@prisma/client";

import { BRANDING, INVOICE } from "@app/shared/config/config";
import type { DiscountInput } from "@app/shared/lib/calculations";
import type { LineItemGroupInput, LineItemInput } from "@app/shared/schemas";

import { prisma } from "@app/server/db";
import { buildItemRowBase, createItemGroupsGeneric } from "@app/server/invoices/item-groups";
import {
  RECURRING_INCLUDE,
  type RecurringInvoiceWithRelations,
} from "@app/server/recurring/include";

export class ClientNotFoundError extends Error {
  constructor() {
    super("Client not found");
    this.name = "ClientNotFoundError";
  }
}

export class RecurringInvoiceNotFoundError extends Error {
  constructor() {
    super("Recurring invoice not found");
    this.name = "RecurringInvoiceNotFoundError";
  }
}

export interface CreateRecurringInvoiceInput {
  clientId: string;
  name: string;
  frequency: RecurringFrequency;
  currency?: string;
  discount?: DiscountInput;
  taxRate?: number;
  notes?: string;
  dueDays?: number;
  autoSend?: boolean;
  startDate: Date;
  endDate?: Date;
  items: LineItemInput[];
  itemGroups?: LineItemGroupInput[];
}

export interface UpdateRecurringInvoiceInput {
  name?: string;
  frequency?: RecurringFrequency;
  status?: RecurringStatus;
  currency?: string;
  discount?: DiscountInput | null;
  taxRate?: number;
  notes?: string;
  dueDays?: number;
  autoSend?: boolean;
  nextRunAt?: Date;
  endDate?: Date | null;
  items?: LineItemInput[];
  itemGroups?: LineItemGroupInput[];
}

async function createRecurringItemGroups(
  tx: Prisma.TransactionClient,
  recurringInvoiceId: string,
  groups: LineItemGroupInput[]
) {
  await createItemGroupsGeneric({
    groups,
    createGroup: ({ title, sortOrder }) =>
      tx.recurringInvoiceItemGroup.create({
        data: { recurringInvoiceId, title, sortOrder },
      }),
    buildItemRow: (item, groupId, sortOrder) => ({
      ...buildItemRowBase(item, groupId, sortOrder),
      recurringInvoiceId,
    }),
    createManyItems: (data) => tx.recurringInvoiceItem.createMany({ data }),
  });
}

async function deleteRecurringItems(tx: Prisma.TransactionClient, recurringInvoiceId: string) {
  await tx.recurringInvoiceItem.deleteMany({ where: { recurringInvoiceId } });
  await tx.recurringInvoiceItemGroup.deleteMany({ where: { recurringInvoiceId } });
}

export async function createRecurringInvoice(
  userId: string,
  data: CreateRecurringInvoiceInput
): Promise<RecurringInvoiceWithRelations> {
  const client = await prisma.client.findFirst({
    where: { id: data.clientId, userId },
  });

  if (!client) {
    throw new ClientNotFoundError();
  }

  return prisma.$transaction(async (tx) => {
    const recurring = await tx.recurringInvoice.create({
      data: {
        userId,
        clientId: data.clientId,
        name: data.name,
        frequency: data.frequency,
        currency: data.currency || BRANDING.DEFAULT_CURRENCY,
        discountType: data.discount?.type || null,
        discountValue: data.discount?.value || 0,
        taxRate: data.taxRate || 0,
        notes: data.notes || null,
        dueDays: data.dueDays || INVOICE.DEFAULT_DUE_DAYS,
        autoSend: data.autoSend || false,
        nextRunAt: data.startDate,
        endDate: data.endDate || null,
        items: {
          create: data.items.map((item, i) => ({
            title: item.title,
            description: item.description ?? null,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sortOrder: item.sortOrder ?? i,
          })),
        },
      },
      include: RECURRING_INCLUDE,
    });

    if (data.itemGroups?.length) {
      await createRecurringItemGroups(tx, recurring.id, data.itemGroups);

      return tx.recurringInvoice.findUniqueOrThrow({
        where: { id: recurring.id },
        include: RECURRING_INCLUDE,
      });
    }

    return recurring;
  });
}

export async function updateRecurringInvoice(
  userId: string,
  id: string,
  data: UpdateRecurringInvoiceInput
): Promise<RecurringInvoiceWithRelations> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.recurringInvoice.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new RecurringInvoiceNotFoundError();
    }

    const hasItemChanges = data.items !== undefined || data.itemGroups !== undefined;

    if (hasItemChanges) {
      await deleteRecurringItems(tx, id);
    }

    const updated = await tx.recurringInvoice.update({
      where: { id },
      data: {
        name: data.name,
        frequency: data.frequency,
        status: data.status,
        currency: data.currency,
        discountType: data.discount === null ? null : data.discount?.type,
        discountValue: data.discount === null ? 0 : data.discount?.value,
        taxRate: data.taxRate,
        notes: data.notes,
        dueDays: data.dueDays,
        autoSend: data.autoSend,
        nextRunAt: data.nextRunAt,
        endDate: data.endDate,
        ...(hasItemChanges &&
          data.items && {
            items: {
              create: data.items.map((item, i) => ({
                title: item.title,
                description: item.description ?? null,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                sortOrder: item.sortOrder ?? i,
              })),
            },
          }),
      },
      include: RECURRING_INCLUDE,
    });

    if (hasItemChanges && data.itemGroups?.length) {
      await createRecurringItemGroups(tx, id, data.itemGroups);

      return tx.recurringInvoice.findUniqueOrThrow({
        where: { id },
        include: RECURRING_INCLUDE,
      });
    }

    return updated;
  });
}

export async function deleteRecurringInvoice(
  userId: string,
  id: string
): Promise<{ success: true }> {
  const existing = await prisma.recurringInvoice.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new RecurringInvoiceNotFoundError();
  }

  await prisma.recurringInvoice.delete({
    where: { id },
  });

  return { success: true };
}
