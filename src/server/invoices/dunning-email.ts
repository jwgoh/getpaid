import type { Prisma } from "@prisma/client";

import { asCents } from "@app/shared/types/money";

import { buildInvoiceEmailPayload, type ResendEmailPayload } from "@app/server/email";
import {
  buildEmailBranding,
  mapInvoiceItem,
  mapInvoiceItemGroups,
} from "@app/server/email/invoice-email-dto";
import { ITEM_GROUPS_INCLUDE } from "@app/server/invoices/item-groups";

export const INVOICE_FOR_REMINDER_INCLUDE = {
  client: true,
  items: { where: { groupId: null }, orderBy: { sortOrder: "asc" as const } },
  itemGroups: ITEM_GROUPS_INCLUDE,
  user: { include: { senderProfile: true } },
} satisfies Prisma.InvoiceInclude;

export type InvoiceForReminder = Prisma.InvoiceGetPayload<{
  include: typeof INVOICE_FOR_REMINDER_INCLUDE;
}>;

// Reuses the invoice-email builder; overrides the subject to make it a reminder.
export function buildReminderPayload(
  invoice: InvoiceForReminder,
  stage: number
): ResendEmailPayload {
  const profile = invoice.user.senderProfile;
  const senderName = profile?.companyName || profile?.displayName || invoice.user.email;
  const senderEmail = profile?.emailFrom || invoice.user.email;

  const base = buildInvoiceEmailPayload({
    clientName: invoice.client.name,
    clientEmail: invoice.client.email,
    senderName,
    senderEmail,
    publicId: invoice.publicId,
    total: asCents(invoice.total),
    currency: invoice.currency,
    dueDate: invoice.dueDate,
    periodStart: invoice.periodStart,
    periodEnd: invoice.periodEnd,
    message: invoice.message,
    branding: buildEmailBranding(profile),
    paymentReference: invoice.paymentReference,
    items: invoice.items.map(mapInvoiceItem),
    itemGroups: mapInvoiceItemGroups(invoice.itemGroups),
  });

  return {
    ...base,
    subject: `Reminder ${stage}: invoice ${invoice.paymentReference ?? invoice.publicId} is overdue`,
  };
}
