import {
  Invoice,
  InvoiceEvent,
  InvoiceEventType,
  InvoiceStatus,
  PaymentMethod,
  Prisma,
} from "@prisma/client";

import { FOLLOWUP_STATUS, INVOICE_EVENT, INVOICE_STATUS } from "@app/shared/config/invoice-status";
import type { InvoiceId, PublicId, UserId } from "@app/shared/types/ids";

import { prisma } from "@app/server/db";

const INVOICE_PAID_INCLUDE = {
  client: true,
  items: true,
} as const satisfies Prisma.InvoiceInclude;

export type InvoicePaidEntity = Prisma.InvoiceGetPayload<{ include: typeof INVOICE_PAID_INCLUDE }>;

export async function markInvoiceViewed(publicId: PublicId): Promise<Invoice | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { publicId },
  });

  if (!invoice || invoice.viewedAt) {
    return invoice;
  }

  const updated = await prisma.invoice.update({
    where: { publicId },
    data: {
      viewedAt: new Date(),
      status: invoice.status === INVOICE_STATUS.SENT ? INVOICE_STATUS.VIEWED : invoice.status,
    },
  });

  await prisma.invoiceEvent.create({
    data: {
      invoiceId: invoice.id,
      type: INVOICE_EVENT.VIEWED,
      payload: {},
    },
  });

  return updated;
}

export async function markInvoicePaid(
  id: InvoiceId,
  userId: UserId,
  method: PaymentMethod = "MANUAL"
): Promise<InvoicePaidEntity | null> {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id, userId, paidAt: null },
    });

    if (!invoice) {
      return null;
    }

    const updated = await tx.invoice.update({
      where: { id },
      data: {
        status: INVOICE_STATUS.PAID,
        paidAt: new Date(),
        paymentMethod: method,
      },
      include: INVOICE_PAID_INCLUDE,
    });

    await tx.invoiceEvent.create({
      data: {
        invoiceId: invoice.id,
        type: INVOICE_EVENT.PAID_MANUAL,
        payload: {},
      },
    });

    await tx.followUpJob.updateMany({
      where: { invoiceId: invoice.id, status: FOLLOWUP_STATUS.PENDING },
      data: { status: FOLLOWUP_STATUS.CANCELED },
    });

    return updated;
  });
}

type InvoiceClient = Prisma.TransactionClient | typeof prisma;

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
  additionalData: Record<string, unknown> = {},
  client: InvoiceClient = prisma
): Promise<Invoice> {
  return client.invoice.update({
    where: { id },
    data: {
      status,
      ...additionalData,
    },
  });
}

export async function logInvoiceEvent(
  invoiceId: string,
  type: InvoiceEventType,
  payload: Prisma.InputJsonValue = {},
  client: InvoiceClient = prisma
): Promise<InvoiceEvent> {
  return client.invoiceEvent.create({
    data: {
      invoiceId,
      type,
      payload,
    },
  });
}
