import { Prisma } from "@prisma/client";

import { BRANDING, INVOICE } from "@app/shared/config/config";
import type { DiscountInput } from "@app/shared/lib/calculations";
import type { LineItemGroupInput, LineItemInput } from "@app/shared/schemas";
import type { UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";
import { buildItemRowBase, createItemGroupsGeneric } from "@app/server/invoices/item-groups";

export interface CreateTemplateInput {
  name: string;
  description?: string;
  currency?: string;
  discount?: DiscountInput;
  taxRate?: number;
  notes?: string;
  dueDays?: number;
  items: LineItemInput[];
  itemGroups?: LineItemGroupInput[];
}

export interface UpdateTemplateInput {
  name?: string;
  description?: string;
  currency?: string;
  discount?: DiscountInput | null;
  taxRate?: number;
  notes?: string;
  dueDays?: number;
  items?: LineItemInput[];
  itemGroups?: LineItemGroupInput[];
}

const ITEMS_INCLUDE = {
  items: { orderBy: { sortOrder: "asc" } },
  itemGroups: {
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { sortOrder: "asc" },
  },
} as const satisfies Prisma.InvoiceTemplateInclude;

export type TemplateWithRelations = Prisma.InvoiceTemplateGetPayload<{
  include: typeof ITEMS_INCLUDE;
}>;

export async function getTemplates(userId: UserId): Promise<TemplateWithRelations[]> {
  return prisma.invoiceTemplate.findMany({
    where: { userId },
    include: ITEMS_INCLUDE,
    orderBy: { updatedAt: "desc" },
  });
}

export async function getTemplate(
  id: string,
  userId: UserId
): Promise<TemplateWithRelations | null> {
  return prisma.invoiceTemplate.findFirst({
    where: { id, userId },
    include: ITEMS_INCLUDE,
  });
}

async function createTemplateItemGroups(templateId: string, groups: LineItemGroupInput[]) {
  await createItemGroupsGeneric({
    groups,
    createGroup: ({ title, sortOrder }) =>
      prisma.invoiceTemplateItemGroup.create({ data: { templateId, title, sortOrder } }),
    buildItemRow: (item, groupId, sortOrder) => ({
      ...buildItemRowBase(item, groupId, sortOrder),
      templateId,
    }),
    createManyItems: (data) => prisma.invoiceTemplateItem.createMany({ data }),
  });
}

async function deleteTemplateItems(templateId: string) {
  await prisma.invoiceTemplateItem.deleteMany({ where: { templateId } });
  await prisma.invoiceTemplateItemGroup.deleteMany({ where: { templateId } });
}

export async function createTemplate(
  userId: UserId,
  data: CreateTemplateInput
): Promise<TemplateWithRelations> {
  const template = await prisma.invoiceTemplate.create({
    data: {
      userId,
      name: data.name,
      description: data.description,
      currency: data.currency || BRANDING.DEFAULT_CURRENCY,
      discountType: data.discount?.type,
      discountValue: data.discount?.value || 0,
      taxRate: data.taxRate || 0,
      notes: data.notes,
      dueDays: data.dueDays || INVOICE.DEFAULT_DUE_DAYS,
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
    include: ITEMS_INCLUDE,
  });

  if (data.itemGroups?.length) {
    await createTemplateItemGroups(template.id, data.itemGroups);

    return prisma.invoiceTemplate.findUniqueOrThrow({
      where: { id: template.id },
      include: ITEMS_INCLUDE,
    });
  }

  return template;
}

function buildTemplateUpdateData(data: UpdateTemplateInput) {
  return {
    ...(data.name !== undefined && { name: data.name }),
    ...(data.description !== undefined && { description: data.description }),
    ...(data.currency !== undefined && { currency: data.currency }),
    ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.dueDays !== undefined && { dueDays: data.dueDays }),
    ...(data.discount !== undefined &&
      (data.discount
        ? { discountType: data.discount.type, discountValue: data.discount.value }
        : { discountType: null, discountValue: 0 })),
  };
}

function buildItemsCreate(items: NonNullable<UpdateTemplateInput["items"]>) {
  return {
    items: {
      create: items.map((item, i) => ({
        title: item.title,
        description: item.description ?? null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: item.sortOrder ?? i,
      })),
    },
  };
}

export async function updateTemplate(
  id: string,
  userId: UserId,
  data: UpdateTemplateInput
): Promise<TemplateWithRelations | null> {
  const template = await prisma.invoiceTemplate.findFirst({
    where: { id, userId },
  });

  if (!template) {
    return null;
  }

  const hasItemChanges = data.items !== undefined || data.itemGroups !== undefined;

  if (hasItemChanges) {
    await deleteTemplateItems(id);
  }

  const updated = await prisma.invoiceTemplate.update({
    where: { id },
    data: {
      ...buildTemplateUpdateData(data),
      ...(hasItemChanges && data.items && buildItemsCreate(data.items)),
    },
    include: ITEMS_INCLUDE,
  });

  if (hasItemChanges && data.itemGroups?.length) {
    await createTemplateItemGroups(id, data.itemGroups);

    return prisma.invoiceTemplate.findUniqueOrThrow({
      where: { id },
      include: ITEMS_INCLUDE,
    });
  }

  return updated;
}

export async function deleteTemplate(
  id: string,
  userId: UserId
): Promise<{ success: true } | null> {
  const template = await prisma.invoiceTemplate.findFirst({
    where: { id, userId },
  });

  if (!template) {
    return null;
  }

  await prisma.invoiceTemplate.delete({
    where: { id },
  });

  return { success: true };
}
